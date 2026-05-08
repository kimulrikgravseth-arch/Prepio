/* ── POST /api/interview/message ─────────────────────────────────────────────
   Sender neste melding i samtalen og returnerer AI-respons.
   ─────────────────────────────────────────────────────────────────────────── */
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { logError, validateHistory, checkRateLimit, setSecurityHeaders } = require('../_lib');
const { buildSystemPrompt } = require('../_interview');

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode ikke tillatt.' });
  }

  if (!checkRateLimit(req)) {
    return res.status(429).json({ error: 'For mange forespørsler. Vent litt og prøv igjen om et minutt.' });
  }

  const { jobTitle, company, description, experience, interviewStyle, messages } = req.body;

  const histErr = validateHistory(messages);
  if (histErr) return res.status(400).json({ error: histErr });

  try {
    const client   = new Anthropic();
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 512,
      system:     buildSystemPrompt({ jobTitle, company, description, experience, interviewStyle }),
      messages,
    });
    res.json({ message: response.content[0].text });
  } catch (err) {
    logError('interview/message', err);
    res.status(500).json({ error: 'Klarte ikke hente neste spørsmål. Sjekk internettforbindelsen og prøv igjen.' });
  }
}

module.exports = handler;
