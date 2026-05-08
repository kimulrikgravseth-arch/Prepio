/* ── POST /api/interview/start ───────────────────────────────────────────────
   Starter en ny intervju-økt og returnerer første velkomst + spørsmål fra AI.
   ─────────────────────────────────────────────────────────────────────────── */
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { logError, validateText, checkRateLimit, setSecurityHeaders } = require('../_lib');
const { buildSystemPrompt } = require('../_interview');

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode ikke tillatt.' });
  }

  if (!checkRateLimit(req)) {
    return res.status(429).json({ error: 'For mange forespørsler. Vent litt og prøv igjen om et minutt.' });
  }

  const { jobTitle, company, description, experience, interviewStyle } = req.body;

  const err =
    validateText(jobTitle,    'Stillingstittel',      200)  ||
    validateText(company,     'Bedriftsnavn',          200)  ||
    validateText(description, 'Stillingsbeskrivelse', 8000)  ||
    (!experience ? 'Erfaringsnivå mangler.' : null);
  if (err) return res.status(400).json({ error: err });

  try {
    const client   = new Anthropic();
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 512,
      system:     buildSystemPrompt({ jobTitle, company, description, experience, interviewStyle }),
      messages:   [{ role: 'user', content: 'Hei, jeg er klar for intervjuet.' }],
    });
    res.json({ message: response.content[0].text });
  } catch (err) {
    logError('interview/start', err);
    res.status(500).json({ error: 'Klarte ikke starte intervjuet. Sjekk internettforbindelsen og prøv igjen.' });
  }
}

module.exports = handler;
