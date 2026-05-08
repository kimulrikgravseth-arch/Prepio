/* ── POST /api/interview/hint ────────────────────────────────────────────────
   Gir et diskret hint til kandidaten basert på siste spørsmål.
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
      max_tokens: 150,
      system:     buildSystemPrompt({ jobTitle, company, description, experience, interviewStyle }),
      messages: [
        ...messages,
        {
          role:    'user',
          content: 'Brukeren trenger et hint. Gi et kort tips på 1-2 setninger om hvordan de kan svare på det siste spørsmålet, uten å gi bort svaret. Vær konkret og norsk i tonen. Svar kun med selve hintet, ingen innledning.',
        },
      ],
    });
    res.json({ hint: response.content[0].text.trim() });
  } catch (err) {
    logError('interview/hint', err);
    res.status(500).json({ error: 'Klarte ikke generere hint. Prøv igjen.' });
  }
}

module.exports = handler;
