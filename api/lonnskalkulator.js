/* ── POST /api/lonnskalkulator ────────────────────────────────────────────────
   Returnerer lønnsestimat og personlig forhandlingsstrategi basert på
   stillingstittel, bransje, erfaringsnivå og geografi.
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

  const { jobTitle, industry, experience, location, currentSalary } = req.body;

  const err =
    validateText(jobTitle,   'Stillingstittel', 200) ||
    validateText(industry,   'Bransje',         100) ||
    validateText(experience, 'Erfaringsnivå',   100) ||
    validateText(location,   'Geografi',        100);
  if (err) return res.status(400).json({ error: err });

  if (currentSalary !== undefined && currentSalary !== null && currentSalary !== '') {
    const num = Number(currentSalary);
    if (isNaN(num) || num < 0 || num > 10_000_000) {
      return res.status(400).json({ error: 'Ugyldig lønnsverdi.' });
    }
  }

  const systemPrompt = `Du er en norsk lønnsekspert med inngående kjennskap til norsk arbeidsmarked og lønnsnivåer. Basert på stillingstittel, bransje, erfaringsnivå og geografi skal du gi et konkret lønnsestimat og en personlig forhandlingsstrategi.

Svar KUN med et gyldig JSON-objekt – ingen annen tekst:
{
  "tittel": "<stillingstittel og kontekst, f.eks. 'Markedskoordinator i Oslo'>",
  "lav": <laveste realistiske månedlønn som heltall i kr>,
  "hoy": <høyeste realistiske månedlønn som heltall i kr>,
  "median": <typisk månedlønn for de fleste i rollen som heltall i kr>,
  "utvikling": "<hva man kan forvente etter 2–3 år, 2 setninger>",
  "forhandlingstips": ["<konkret tips>", "<konkret tips>", "<konkret tips>"],
  "pass_paa": ["<vanlig feil nordmenn gjør>", "<feil>", "<feil>"],
  "strategi": {
    "timing": "<når i prosessen skal man ta opp lønn, og hvordan – 1-2 setninger>",
    "ankerpunkt": "<hva er det første konkrete tallet/intervallet man bør si, og hvorfor – 1-2 setninger>",
    "aapningsetninger": [
      "<konkret norsk setning man kan si for å åpne lønnsforhandlingen naturlig – eksempel 1>",
      "<konkret norsk setning – eksempel 2>",
      "<konkret norsk setning – eksempel 3>"
    ],
    "hvis_nei": "<hva gjør man hvis de sier nei til lønnskravet – konkret strategi, 2-3 setninger>",
    "andre_goder": ["<gode man kan forhandle på, f.eks. pensjon>", "<gode>", "<gode>", "<gode>", "<gode>"]
  },
  "vanlige_feil": [
    "<konkret advarsel basert på erfaringsnivå – feil folk gjør på dette stadiet>",
    "<advarsel 2>",
    "<advarsel 3>"
  ],
  "mental_forberedelse": "<en kort, motiverende pep-talk på norsk om mindset – hvordan tenke på lønn som en normal forretningssamtale. 3-4 setninger, varm og direkte tone.>"
}

Vær konkret med tall basert på oppdatert kunnskap om norsk lønnsnivå. Snakk alltid norsk. Tilpass strategi, feil og pep-talk spesifikt til erfaringsnivå og bransje.`;

  try {
    const client   = new Anthropic();
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2048,
      system:     systemPrompt,
      messages: [{
        role:    'user',
        content: `Stilling: ${jobTitle}\nBransje: ${industry}\nErfaring: ${experience}\nGeografi: ${location}${currentSalary ? `\nNåværende lønn: ${currentSalary} kr/mnd` : ''}`,
      }],
    });

    const text      = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI returnerte ugyldig format');

    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    logError('lonnskalkulator', err);
    res.status(500).json({ error: 'Klarte ikke beregne lønn. Sjekk internettforbindelsen og prøv igjen.' });
  }
}

module.exports = handler;
