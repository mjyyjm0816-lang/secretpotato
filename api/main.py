from __future__ import annotations

import io
import uuid

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from .inference import ParkingClassifier


app = FastAPI(title="MOVE Parking Analysis API", version="1.0.0")
classifier = ParkingClassifier()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "model": "YOLO Segment + LinearSVMBalanced"}


@app.post("/api/v1/parking/analyze")
async def analyze_parking(image: UploadFile = File(...)) -> dict:
    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(415, "이미지 파일만 업로드할 수 있습니다.")
    payload = await image.read()
    if len(payload) > 15 * 1024 * 1024:
        raise HTTPException(413, "이미지는 15MB 이하여야 합니다.")
    try:
        picture = Image.open(io.BytesIO(payload))
        result = classifier.predict(picture)
    except UnidentifiedImageError as exc:
        raise HTTPException(400, "올바른 이미지 파일이 아닙니다.") from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    result["requestId"] = str(uuid.uuid4())
    return result
