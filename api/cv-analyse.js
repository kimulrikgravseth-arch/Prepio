/* ── POST /api/cv-analyse ────────────────────────────────────────────────────
   Analyserer en opplastet CV (PDF eller Word) opp mot en stillingstittel.
   Bruker multer for filhåndtering — Vercels innebygde body-parser er slått av.
   ─────────────────────────────────────────────────────────────────────────── */
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const multer    = require('multer');
const pdfParse  = require('pdf-parse');
const mammoth   = require('mammoth');
const { logError, validateText, checkRateLimit, setSecurityHeaders } = require('./_lib');

// Kun i minne — ingen disk-lagring på Vercel
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Hjelpefunksjon: kjør multer som Promise
function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload.single('cv')(req, res, (err) => {
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

  // Parse multipart/form-data
  try {
    await runMulter(req, res);
  } catch (multerErr) {
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Filen er for stor — maks 10 MB.' });
    }
    return res.status(400).json({ error: 'Klarte ikke lese opplastet fil.' });
  }

  if (!req.file) return res.status(400).json({ error: 'Ingen fil lastet opp.' });

  const { jobTitle, jobDescription } = req.body;
  const err = validateText(jobTitle, 'Stillingstittel', 200);
  if (err) return res.status(400).json({ error: err });

  // Trekk ut tekst fra opplastet fil
  let cvText = '';
  const mime = req.file.mimetype;
  try {
    if (mime === 'application/pdf') {
      const parsed = await pdfParse(req.file.buffer);
      cvText = parsed.text;
    } else if (
      mime === 'application/msword' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      cvText = result.value;
    } else {
      return res.status(400).json({ error: 'Kun PDF og Word-filer (.doc/.docx) støttes.' });
    }
  } catch {
    return res.status(422).json({ error: 'Klarte ikke lese filen. Prøv en annen fil.' });
  }

  if (!cvText.trim()) {
    return res.status(422).json({ error: 'Filen ser ut til å være tom eller ikke lesbar (f.eks. skannet bilde). Prøv en tekstbasert PDF.' });
  }

  const systemPrompt = `Du er en erfaren norsk HR-konsulent med lang erfaring fra norsk arbeidsliv. Analyser denne CV-en for stillingen som er oppgitt.

Svar KUN med et gyldig JSON-objekt – ingen annen tekst:
{
  "score": <heltall 1–10>,
  "helhetsvurdering": "<kort oppsummering av kandidaten, 2–3 setninger>",
  "sterke_sider": ["<konkret punkt>", "<konkret punkt>", "<konkret punkt>"],
  "forbedringspunkter": ["<konkret punkt>", "<konkret punkt>", "<konkret punkt>"],
  "norsk_arbeidsmarked": ["<spesifikt tips tilpasset norske arbeidsgivere>", "<tips>"],
  "konkrete_endringer": ["<spesifikk endring å gjøre nå>", "<endring>", "<endring>"]
}

Vær direkte, konkret og jordnær. Referer til faktisk innhold fra CV-en. Snakk alltid norsk.`;

  try {
    const client   = new Anthropic();
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2048,
      system:     systemPrompt,
      messages: [{
        role:    'user',
        content: `Stilling: ${jobTitle}\n\nStilingsbeskrivelse:\n${jobDescription || 'Ikke oppgitt'}\n\nCV:\n${cvText.slice(0, 12000)}`,
      }],
    });

    const text      = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI returnerte ugyldig format');

    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    logError('cv-analyse', err);
    res.status(500).json({ error: 'Klarte ikke analysere CV-en. Sjekk internettforbindelsen og prøv igjen.' });
  }
}

// Slå av Vercels innebygde body-parser — multer håndterer multipart selv
handler.config = { api: { bodyParser: false } };

module.exports = handler;
