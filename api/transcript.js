import { YoutubeTranscript } from 'youtube-transcript';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: 'videoId 파라미터가 필요합니다.' });
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ko' });
    const text = transcript.map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim();
    return res.status(200).json({ success: true, videoId, text, count: transcript.length });
  } catch (e) {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      const text = transcript.map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim();
      return res.status(200).json({ success: true, videoId, text, count: transcript.length });
    } catch (e2) {
      return res.status(500).json({ success: false, error: '자막을 가져올 수 없습니다.' });
    }
  }
}
