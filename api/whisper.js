import formidable from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API 키가 설정되지 않았습니다.' });

  try {
    const form = formidable({ maxFileSize: 25 * 1024 * 1024 }); // 25MB 제한
    const [, files] = await form.parse(req);

    const file = files.audio?.[0];
    if (!file) return res.status(400).json({ error: '음원 파일이 없습니다.' });

    const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg', 'video/mp4'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: '지원하지 않는 파일 형식이에요. (mp3, mp4, wav, webm, ogg)' });
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(file.filepath), {
      filename: file.originalFilename || 'audio.mp3',
      contentType: file.mimetype,
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'ko'); // 한국어 우선 (자동감지도 가능)
    formData.append('response_format', 'text');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.json();
      return res.status(500).json({ error: 'Whisper API 오류: ' + (err.error?.message || '알 수 없는 오류') });
    }

    const text = await whisperRes.text();
    return res.status(200).json({ success: true, text: text.trim() });

  } catch (e) {
    return res.status(500).json({ error: '서버 오류: ' + e.message });
  }
}
