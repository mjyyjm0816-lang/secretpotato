from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np
from PIL import Image, ImageOps
from ultralytics import YOLO


ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / "models"
YOLO_PATH = MODEL_DIR / "best.pt"
SVM_PATH = MODEL_DIR / "situation_classifier_linear_svm_balanced_1to4.joblib"

CLASS_KEYS = {
    0: "c0_1_scooter",
    1: "c1_wall",
    2: "c2_state",
    3: "c3_sidewalk",
    4: "c4_road",
    5: "c5_block",
    6: "c6_car",
    7: "c7_grass",
    8: "c8_bikeroad",
}
RELATION_CLASSES = (1, 3, 4, 5, 6, 7, 8)
LABEL_TO_REASON = {0: 0, 1: 1, 2: 2, 3: 3, 4: 4}


@dataclass
class Detection:
    class_id: int
    cx: float
    cy: float
    w: float
    h: float
    area: float

    @property
    def box(self) -> tuple[float, float, float, float]:
        return (
            max(0.0, self.cx - self.w / 2),
            max(0.0, self.cy - self.h / 2),
            min(1.0, self.cx + self.w / 2),
            min(1.0, self.cy + self.h / 2),
        )


def polygon_area(points: np.ndarray) -> float:
    if len(points) < 3:
        return 0.0
    x, y = points[:, 0], points[:, 1]
    return float(abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1))) / 2)


def intersection_area(a: Detection | None, b: Detection | None) -> float:
    if not a or not b:
        return 0.0
    ax1, ay1, ax2, ay2 = a.box
    bx1, by1, bx2, by2 = b.box
    return max(0.0, min(ax2, bx2) - max(ax1, bx1)) * max(0.0, min(ay2, by2) - max(ay1, by1))


class ParkingClassifier:
    def __init__(self) -> None:
        missing = [str(path) for path in (YOLO_PATH, SVM_PATH) if not path.exists()]
        if missing:
            raise FileNotFoundError(f"모델 파일이 없습니다: {', '.join(missing)}")
        bundle = joblib.load(SVM_PATH)
        self.svm = bundle["model"]
        self.feature_names = bundle["feature_names"]
        self.label_names = {int(k): v for k, v in bundle["label_names"].items()}
        self.yolo = YOLO(YOLO_PATH)

    def extract(self, image: Image.Image) -> tuple[list[float], int]:
        orientation = int(image.getexif().get(274, 1))
        raw_width, raw_height = image.size
        aspect = raw_width / raw_height if raw_height else 1.0
        upright = ImageOps.exif_transpose(image).convert("RGB")
        result = self.yolo.predict(np.asarray(upright), imgsz=640, conf=0.25, verbose=False)[0]

        detections: dict[int, list[Detection]] = {i: [] for i in CLASS_KEYS}
        if result.boxes is not None and len(result.boxes):
            boxes = result.boxes.xywhn.cpu().numpy()
            classes = result.boxes.cls.cpu().numpy().astype(int)
            polygons = result.masks.xyn if result.masks is not None else [None] * len(boxes)
            for class_id, box, polygon in zip(classes, boxes, polygons):
                if class_id not in detections:
                    continue
                cx, cy, width, height = map(float, box)
                area = polygon_area(np.asarray(polygon)) if polygon is not None else width * height
                detections[class_id].append(Detection(class_id, cx, cy, width, height, area))

        values: dict[str, float] = {}
        largest: dict[int, Detection | None] = {}
        for class_id, key in CLASS_KEYS.items():
            items = detections[class_id]
            main = max(items, key=lambda item: item.area, default=None)
            largest[class_id] = main
            values.update({
                f"{key}_bottom": (main.cy + main.h / 2) if main else 0.0,
                f"{key}_count": float(len(items)),
                f"{key}_cx": main.cx if main else 0.0,
                f"{key}_cy": main.cy if main else 0.0,
                f"{key}_h": main.h if main else 0.0,
                f"{key}_has": float(bool(items)),
                f"{key}_max_area": main.area if main else 0.0,
                f"{key}_total_area": sum(item.area for item in items),
                f"{key}_w": main.w if main else 0.0,
            })

        values["image_aspect"] = aspect
        values["image_orientation"] = float(orientation)
        scooter = largest[0]
        scooter_box_area = scooter.w * scooter.h if scooter else 0.0
        for class_id in RELATION_CLASSES:
            other = largest[class_id]
            other_key = CLASS_KEYS[class_id]
            scooter_cx, scooter_cy = (scooter.cx, scooter.cy) if scooter else (0.0, 0.0)
            other_cx, other_cy = (other.cx, other.cy) if other else (0.0, 0.0)
            inter = intersection_area(scooter, other)
            other_box_area = other.w * other.h if other else 0.0
            prefix = f"scooter_to_{other_key}"
            values[f"{prefix}_center_distance"] = math.hypot(scooter_cx - other_cx, scooter_cy - other_cy)
            values[f"{prefix}_inter_area"] = inter
            values[f"{prefix}_inter_over_other"] = inter / other_box_area if other_box_area else 0.0
            values[f"{prefix}_inter_over_scooter"] = inter / scooter_box_area if scooter_box_area else 0.0
        values["total_objects"] = float(sum(len(items) for items in detections.values()))

        unknown = set(self.feature_names) - values.keys()
        if unknown:
            raise RuntimeError(f"계산되지 않은 특징: {sorted(unknown)}")
        return [values[name] for name in self.feature_names], len(detections[0])

    def predict(self, image: Image.Image) -> dict:
        features, scooter_count = self.extract(image)
        if scooter_count == 0:
            raise ValueError("사진에서 킥보드를 찾지 못했습니다. 킥보드 전체가 보이도록 다시 촬영해 주세요.")
        row = np.asarray([features], dtype=np.float64)
        label = int(self.svm.predict(row)[0])
        scores = np.asarray(self.svm.decision_function(row))[0]
        scores = scores - np.max(scores)
        confidence = float(np.exp(scores)[list(self.svm.classes_).index(label)] / np.exp(scores).sum())
        return {
            "approved": label == 1,
            "confidence": round(confidence, 4),
            "reasonCode": LABEL_TO_REASON[label],
            "modelLabel": label,
            "labelName": self.label_names[label],
            "detectedObjects": int(features[self.feature_names.index("total_objects")]),
        }
