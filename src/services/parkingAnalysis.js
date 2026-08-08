// 실제 YOLO Segment API 연동 지점입니다.
// 운영 전환 시 이 함수 내부만 서버 API 호출로 교체하면 UI 흐름은 그대로 유지됩니다.
export async function analyzeParkingPhoto({ imageFile, latitude, longitude, mockResult = 0 }) {
  await new Promise((resolve) => setTimeout(resolve, 1900));

  // Example production implementation:
  // const form = new FormData();
  // form.append('image', imageFile);
  // form.append('latitude', latitude);
  // form.append('longitude', longitude);
  // const response = await fetch('/api/v1/parking/analyze', { method: 'POST', body: form });
  // if (!response.ok) throw new Error('주차 분석에 실패했습니다.');
  // return response.json();

  const detectionCode = Math.min(6, Math.max(0, Number(mockResult)));
  if (detectionCode === 0) {
    return { approved: true, confidence: 0.97, reasonCode: 0, requestId: crypto.randomUUID() };
  }
  return { approved: false, confidence: 0.94, reasonCode: detectionCode, requestId: crypto.randomUUID() };
}
