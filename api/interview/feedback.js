/* ── POST /api/interview/feedback ────────────────────────────────────────────
   Genererer strukturert tilbakemelding etter at alle 5 spørsmål er besvart.
   ─────────────────────────────────────────────────────────────────────────── */
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { logError, validateHistory, checkRateLimit, setSecurityHeaders } = require('../_lib');

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode ikke tillatt.' });
  }

  if (!checkRateLimit(req)) {
    return res.status(429).json({ error: 'For mange forespørsler. Vent litt og prøv igjen om et minutt.' });
  }

  const { jobTitle, company, messages } = req.body;

  const histErr = validateHistory(messages);
  if (histErr) return res.status(400).json({ error: histErr });

  const feedbackSystem = `Du er en erfaren norsk HR-ekspert. Du har nettopp gjennomført et jobbintervju for stillingen ${jobTitle || 'ukjent'} hos ${company || 'ukjent bedrift'}.

Basert på samtalen, gi en strukturert og ærlig tilbakemelding på norsk.

Svar KUN med et gyldig JSON-objekt – ingen annen tekst, ingen markdown-blokk:
{
  "score": <heltall fra 1 til 10>,
  "intro": "<én kort setning som oppsummerer kandidatens helhetsintrykk>",
  "bra": ["<konkret punkt>", "<konkret punkt>", "<konkret punkt>"],
  "forbedring": ["<konkret punkt>", "<konkret punkt>", "<konkret punkt>"],
  "avslutning": "<varm, motiverende avslutning på 1-2 setninger i norsk tone>"
}

Vær konkret og spesifikk – referer gjerne til ting kandidaten faktisk sa. Bruk jordnær norsk, ikke korporativt språk.`;

  try {
    const client   = new Anthropic();
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      system:     feedbackSystem,
      messages:   [...messages, { role: 'user', content: 'Gi meg den strukturerte tilbakemeldingen nå.' }],
    });

    const text      = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI returnerte ugyldig format');

    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    logError('interview/feedback', err);
    res.status(500).json({ error: 'Klarte ikke generere tilbakemelding. Prøv igjen.' });
  }
}

module.exports = handler;
