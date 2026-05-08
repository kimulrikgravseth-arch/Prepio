/* ── POST /api/stt ───────────────────────────────────────────────────────────
   Speech-to-text via OpenAI Whisper. Tar imot en lydfil og returnerer tekst.
   Bruker multer for filhåndtering — Vercels innebygde body-parser er slått av.
   ─────────────────────────────────────────────────────────────────────────── */
require('dotenv').config();
const multer = require('multer');
const { logError, checkRateLimit, setSecurityHeaders } = require('./_lib');

// Kun i minne — 25 MB grense for lydopptak
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 25 * 1024 * 1024 },
});

function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    audioUpload.single('audio')(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode ikke tillatt.' });
  }

  if (!checkRateLimit(req)) {
    return res.status(429).json({ error: 'For mange forespørsler. Vent litt og prøv igjen om et minutt.' });
  }

  try {
    await runMulter(req, res);
  } catch (multerErr) {
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Lydfilen er for stor — maks 25 MB.' });
    }
    return res.status(400).json({ error: 'Klarte ikke lese lydfilen.' });
  }

  if (!req.file) return res.status(400).json({ error: 'Ingen lydfil mottatt.' });
  if (req.file.size < 1000) return res.status(400).json({ error: 'Lydfilen er for kort.' });

  try {
    // Bygg multipart form for Whisper API
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' }),
      'audio.webm'
    );
    formData.append('model',    'whisper-1');
    formData.append('language', 'no');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method:  'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ''}` },
      body:    formData,
    });

    if (!response.ok) {
      const errBody = await response.text();
      logError('STT:Whisper', errBody);
      return res.status(502).json({ error: 'Transkripsjon feilet. Prøv igjen.' });
    }

    const data = await response.json();
    res.json({ transcript: data.text });
  } catch (err) {
    logError('STT:fetch', err);
    res.status(500).json({ error: 'Transkripsjon feilet. Sjekk internettforbindelsen.' });
  }
}

// Slå av Vercels innebygde body-parser — multer håndterer multipart selv
handler.config = { api: { bodyParser: false } };

module.exports = handler;
