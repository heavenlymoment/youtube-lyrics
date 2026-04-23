import { YoutubeTranscript } from 'youtube-transcript';

export default async function handler(req, res) {
  // CORS 허용
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
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'ko', // 한국어 우선
    });

    const text = transcript
      .map((item) => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return res.status(200).json({
      success: true,
      videoId,
      text,
      count: transcript.length,
    });
  } catch (e) {
    // 한국어 자막 없으면 기본 언어로 재시도
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      const text = transcript
        .map((item) => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      return res.status(200).json({
        success: true,
        videoId,
        text,
        count: transcript.length,
      });
    } catch (e2) {
      return res.status(500).json({
        success: false,
        error: '자막을 가져올 수 없습니다. 자막이 없거나 비공개 영상일 수 있어요.',
      });
    }
  }
}
