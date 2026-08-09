export async function analyzeParkingPhoto({ imageFile, latitude, longitude, mockResult = 1 }) {
  if (!imageFile) throw new Error('분석할 사진을 먼저 촬영해 주세요.');

  // GitHub Pages에는 Python AI 서버를 실행할 수 없으므로 테스트 판정을 사용합니다.
  if (globalThis.location?.hostname?.endsWith('github.io')) {
    await new Promise((resolve) => setTimeout(resolve, 1900));
    const reasonCode = Math.min(4, Math.max(0, Number(mockResult)));
    return {
      approved: reasonCode === 1,
      confidence: reasonCode === 1 ? 0.97 : 0.94,
      reasonCode,
      requestId: globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}`,
      demo: true,
    };
  }

  const form = new FormData();
  form.append('image', imageFile);
  if (latitude != null) form.append('latitude', latitude);
  if (longitude != null) form.append('longitude', longitude);
  const response = await fetch('/api/v1/parking/analyze', { method: 'POST', body: form });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || '주차 분석에 실패했습니다.');
  return body;
}
