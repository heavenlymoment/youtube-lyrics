export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'videoId가 필요합니다.' });

  try {
    // 방법 1: Tactiq 공개 API 시도
    const tactiqRes = await fetch(`https://tactiq-apps-prod.tactiq.io/transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl: `https://www.youtube.com/watch?v=${videoId}`, langCode: 'ko' })
    });

    if (tactiqRes.ok) {
      const data = await tactiqRes.json();
      if (data?.captions?.length) {
        const text = data.captions.map(c => c.text).join(' ').replace(/\s+/g, ' ').trim();
        if (text) return res.status(200).json({ success: true, videoId, text });
      }
    }
  } catch (e) {}

  try {
    // 방법 2: YouTube Transcript API 미러 서비스
    const r = await fetch(`https://youtube-transcript.io/api/transcript?videoId=${videoId}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (r.ok) {
      const data = await r.json();
      if (data?.transcript) {
        const text = data.transcript.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim();
        if (text) return res.status(200).json({ success: true, videoId, text });
      }
    }
  } catch (e) {}

  try {
    // 방법 3: Supadata API
    const r = await fetch(`https://api.supadata.ai/v1/youtube/transcript?url=https://www.youtube.com/watch?v=${videoId}&lang=ko`, {
      headers: { 'Accept': 'application/json' }
    });
    if (r.ok) {
      const data = await r.json();
      if (data?.content) {
        const text = Array.isArray(data.content)
          ? data.content.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim()
          : data.content;
        if (text) return res.status(200).json({ success: true, videoId, text });
      }
    }
  } catch (e) {}

  return res.status(404).json({
    success: false,
    error: '자막을 가져올 수 없어요. 자동생성 자막은 일부 제한이 있을 수 있어요.'
  });
}
