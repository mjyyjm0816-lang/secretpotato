# MOVE — PM 반납 검증 프로토타입

공유 킥보드 반납 사진을 촬영하고, 위치를 확인한 뒤, AI 주차 적합성 판정을 체험하는 모바일 우선 프로토타입입니다.

## 실행

Node.js 18 이상과 Python 3.10 이상이 필요합니다. 최초 한 번 다음 명령으로 의존성을 설치합니다.

```bash
npm install
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm run dev
```

터미널에 표시되는 로컬 주소를 브라우저에서 여세요.

## 프로토타입 흐름

1. `반납 시작하기`
2. 카메라 촬영 버튼
3. 현재 위치 확인
4. YOLO 세그멘테이션 및 Linear SVM 판정
5. AI 분석 애니메이션
6. 승인 또는 구체적인 반려 사유 확인

## CV (Computer Vision)

반납 사진의 Computer Vision 처리는 다음 순서로 구성합니다.

1. YOLO Segment M이 사진에서 PM과 주변 공간을 분할합니다.
2. PM 마스크와 점자블록, 보행로, 차도, 주차구역 등의 마스크 관계를 계산합니다.
3. 판정 결과를 아래 Vision Detection Code `0~4` 중 하나로 반환합니다.
4. 앱은 숫자 코드에 맞는 승인 또는 반려 안내를 표시합니다.

| Code | 판정 | 처리 |
|---:|---|---|
| 0 | 킥보드 쓰러짐 | 반납 반려 |
| 1 | 정상 주차 | 반납 승인 |
| 2 | 점자블록 침범 | 반납 반려 |
| 3 | 차도 주차 | 반납 반려 |
| 4 | 자전거도로 주차 | 반납 반려 |

앱과 AI API 사이의 판정 코드는 **숫자 `0~4`만 사용**합니다. 모델의 클래스명과 내부 추론 정보는 앱 화면 로직에 직접 연결하지 않습니다.

## 실제 AI 모델 연동

`models/best.pt`가 사진을 9개 객체 클래스로 세그멘테이션하고, 좌표·면적·영역 관계로 구성된 112개 특징을 추출합니다. `models/situation_classifier_linear_svm_balanced_1to4.joblib`이 이 특징으로 주차 상황을 최종 분류합니다. FastAPI 서버 구현은 `api/`에 있으며 React 앱은 촬영한 원본 사진을 API로 전송합니다.

권장 API 응답 형식:

```json
{
  "approved": false,
  "confidence": 0.94,
  "reasonCode": 1,
  "requestId": "..."
}
```

지원 Vision Detection Code: `0`, `1`, `2`, `3`, `4`.

## Android Studio에서 실행

이 저장소에는 별도 플러그인 없이 실행할 수 있는 네이티브 Android WebView 프로젝트가 `android/`에 포함되어 있습니다.

### 최초 실행

1. Node.js 18 이상과 Android Studio를 설치합니다.
2. 저장소 루트에서 `npm install`을 실행합니다.
3. `npm run android:sync`를 실행해 최신 React 앱을 Android assets로 복사합니다.
4. Android Studio에서 저장소의 `android` 폴더를 엽니다.
5. Gradle Sync가 끝나면 에뮬레이터 또는 Android 기기에서 Run을 누릅니다.

### 웹 화면을 수정한 뒤

```bash
npm run android:sync
```

위 명령을 실행한 다음 Android Studio에서 다시 Run하면 변경된 화면이 반영됩니다.

## Git으로 팀 공유

프로젝트 루트 전체를 Git 저장소로 올리면 됩니다. `node_modules`, 빌드 결과, Android Studio 개인 설정, 서명키는 `.gitignore`에서 제외됩니다.

```bash
git init
git add .
git commit -m "feat: add PM return validation prototype"
git branch -M main
git remote add origin <팀 Git 저장소 주소>
git push -u origin main
```

서명키(`*.jks`, `*.keystore`)와 `local.properties`는 절대로 Git에 올리지 마세요.
