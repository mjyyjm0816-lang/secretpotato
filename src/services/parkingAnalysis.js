export async function analyzeParkingPhoto({ imageFile, latitude, longitude }) {
  if (!imageFile) throw new Error('분석할 사진을 먼저 촬영해 주세요.');
  const form = new FormData();
  form.append('image', imageFile);
  if (latitude != null) form.append('latitude', latitude);
  if (longitude != null) form.append('longitude', longitude);
  const response = await fetch('/api/v1/parking/analyze', { method: 'POST', body: form });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || '주차 분석에 실패했습니다.');
  return body;
}
