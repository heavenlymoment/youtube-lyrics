export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'videoId가 필요합니다.' });

  try {
    // YouTube 자막 페이지 직접 fetch
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      }
    });

    const html = await pageRes.text();

    // captionTracks 추출
    const captionMatch = html.match(/"captionTracks":(\[.*?\])/);
    if (!captionMatch) {
      return res.status(404).json({ success: false, error: '이 영상에는 자막이 없어요.' });
    }

    const captionTracks = JSON.parse(captionMatch[1]);
    if (!captionTracks.length) {
      return res.status(404).json({ success: false, error: '자막 트랙을 찾을 수 없어요.' });
    }

    // 한국어 우선, 없으면 첫 번째
    const track = captionTracks.find(t => t.languageCode === 'ko') || captionTracks[0];
    const captionUrl = track.baseUrl;

    // 자막 XML fetch
    const xmlRes = await fetch(captionUrl);
    const xml = await xmlRes.text();

    // XML에서 텍스트 추출
    const textMatches = xml.match(/<text[^>]*>([\s\S]*?)<\/text>/g) || [];
    const text = textMatches
      .map(t => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim())
      .filter(Boolean)
      .join(' ');

    if (!text) return res.status(404).json({ success: false, error: '자막 텍스트를 추출할 수 없어요.' });

    return res.status(200).json({ success: true, videoId, text });

  } catch (e) {
    return res.status(500).json({ success: false, error: '서버 오류: ' + e.message });
  }
}
