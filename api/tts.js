/* ── POST /api/tts ───────────────────────────────────────────────────────────
   Text-to-speech via ElevenLabs. Returnerer lyd som audio/mpeg.
   API-nøkkelen forblir alltid på server-siden.
   ─────────────────────────────────────────────────────────────────────────── */
require('dotenv').config();
const { logError, validateText, checkRateLimit, setSecurityHeaders } = require('./_lib');

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode ikke tillatt.' });
  }

  if (!checkRateLimit(req)) {
    return res.status(429).json({ error: 'For mange forespørsler. Vent litt og prøv igjen om et minutt.' });
  }

  const { text } = req.body;
  const err = validateText(text, 'Tekst', 1500);
  if (err) return res.status(400).json({ error: err });

  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'ErXwobaYiN019PkySvjV';

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key':   process.env.ELEVENLABS_API_KEY || '',
          'Content-Type': 'application/json',
          'Accept':       'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id:       'eleven_turbo_v2_5',
          language_code:  'no',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      logError('TTS:ElevenLabs', errBody);
      return res.status(502).json({ error: 'Talesyntese feilet. Prøv igjen.' });
    }

    // Lyd returneres direkte — aldri lagret på disk
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (err) {
    logError('TTS:fetch', err);
    res.status(500).json({ error: 'Talesyntese feilet. Sjekk internettforbindelsen.' });
  }
}

module.exports = handler;
