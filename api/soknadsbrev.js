/* ── POST /api/soknadsbrev ───────────────────────────────────────────────────
   Genererer et profesjonelt norsk søknadsbrev basert på brukerens input.
   ─────────────────────────────────────────────────────────────────────────── */
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { logError, validateText, checkRateLimit, setSecurityHeaders } = require('./_lib');

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode ikke tillatt.' });
  }

  if (!checkRateLimit(req)) {
    return res.status(429).json({ error: 'For mange forespørsler. Vent litt og prøv igjen om et minutt.' });
  }

  const { name, jobTitle, company, jobDescription, about } = req.body;

  const err =
    validateText(name,           'Navn',                 100)  ||
    validateText(jobTitle,       'Stillingstittel',       200)  ||
    validateText(company,        'Bedriftsnavn',          200)  ||
    validateText(jobDescription, 'Stillingsbeskrivelse', 6000)  ||
    validateText(about,          'Om deg selv',          3000);
  if (err) return res.status(400).json({ error: err });

  const systemPrompt = `Du er en ekspert på norske søknadsbrev med lang erfaring fra norsk arbeidsliv. Skriv et profesjonelt søknadsbrev på norsk basert på informasjonen du får.

Søknadsbrevet skal:
- Være på norsk og passe norsk arbeidskultur
- Være direkte og konkret — ikke pompøst eller overdrevent
- Ha en sterk åpning som vekker interesse
- Koble søkerens erfaring til stillingens krav
- Avslutte med en tydelig oppfordring til intervju
- Være mellom 250–350 ord
- Ikke inneholde klisjeer som "jeg er en lagspiller" uten å begrunne det

Format: Kun selve brevteksten, klar til å sende. Ingen ekstra kommentarer eller forklaringer.`;

  try {
    const client   = new Anthropic();
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      system:     systemPrompt,
      messages: [{
        role:    'user',
        content: `Navn: ${name}\nStilling: ${jobTitle}\nBedrift: ${company}\n\nStilingsbeskrivelse:\n${jobDescription}\n\nOm søkeren:\n${about}`,
      }],
    });
    res.json({ letter: response.content[0].text.trim() });
  } catch (err) {
    logError('soknadsbrev', err);
    res.status(500).json({ error: 'Klarte ikke generere søknadsbrev. Sjekk internettforbindelsen og prøv igjen.' });
  }
}

module.exports = handler;
