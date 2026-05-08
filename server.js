require('dotenv').config();
const express     = require('express');
const path        = require('path');
const fs          = require('fs');
const Anthropic   = require('@anthropic-ai/sdk');
const multer      = require('multer');
const pdfParse    = require('pdf-parse');
const mammoth     = require('mammoth');
const compression = require('compression');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Feil-logger til fil ─────────────────────────────────────────────────────
   Alle ukritiske feil skrives til errors.log slik at de kan inspiseres
   uten å avbryte serveren. Bruker sync-skriving for å unngå tap av data.
   ─────────────────────────────────────────────────────────────────────────── */
const LOG_FILE = path.join(__dirname, 'errors.log');

function logError(context, err) {
  const line = `[${new Date().toISOString()}] [${context}] ${err?.stack || err}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
  console.error(line.trimEnd());
}

/* ── Krasj-vakt — server avslutter aldri stille ──────────────────────────────
   uncaughtException: synkrone feil som ikke ble fanget noe sted
   unhandledRejection: Promise-avvisninger uten catch
   ─────────────────────────────────────────────────────────────────────────── */
process.on('uncaughtException', (err) => {
  logError('UNCAUGHT_EXCEPTION', err);
  // Gi aktive forbindelser 1 sekund til å avslutte før restart
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason) => {
  logError('UNHANDLED_REJECTION', reason);
});

// ── Sjekk at påkrevde miljøvariabler er satt ved oppstart ────────────────────
const REQUIRED_ENV = ['ANTHROPIC_API_KEY', 'ELEVENLABS_API_KEY', 'OPENAI_API_KEY'];
REQUIRED_ENV.forEach(key => {
  if (!process.env[key]) console.warn(`⚠️  Mangler miljøvariabel: ${key}`);
});

// ── Fil-opplasting (aldri lagret på disk — kun i minne) ───────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB for CV
});

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 25 * 1024 * 1024 }, // 25 MB for lydopptak
});

// ── Middleware ────────────────────────────────────────────────────────────────

// Gzip-komprimering av alle HTTP-svar (reduserer dataoverføring)
app.use(compression());

// CORS — tillat kall kun fra samme opprinnelse (eller valgfri domene via env)
app.use((req, res, next) => {
  const allowed = process.env.ALLOWED_ORIGIN || `http://localhost:${PORT}`;
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Fjern headers som avslører server-teknologi
  res.removeHeader('X-Powered-By');
  // Grunnleggende sikkerhets-headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// JSON-parsing — maks 2 MB for å hindre payload-angrep
app.use(express.json({ limit: '2mb' }));

// Statiske filer med cache-headers
// HTML-filer: ingen cache (alltid fersk)
// JS/CSS/bilder: 1 time i nettleseren
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (/\.(js|css|woff2?|png|jpg|ico|svg)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  },
}));

/* ── In-memory rate limiter — maks 10 API-kall per minutt per IP ────────────
   Beskytter mot misbruk og holder API-kostnadene nede.
   Lagrer tidsstempler per IP i et Map og tømmer gamle oppføringer jevnlig.
   ─────────────────────────────────────────────────────────────────────────── */
const RATE_LIMIT     = 10;   // maks kall per minutt
const RATE_WINDOW_MS = 60_000;
const rateStore      = new Map();

// Rydd opp utdaterte oppføringer hvert 5. minutt for å unngå minnelekkasje
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  rateStore.forEach((timestamps, key) => {
    const fresh = timestamps.filter(t => t > cutoff);
    fresh.length ? rateStore.set(key, fresh) : rateStore.delete(key);
  });
}, 5 * 60_000);

function apiRateLimit(req, res, next) {
  const key  = req.ip || 'unknown';
  const now  = Date.now();
  const hits = (rateStore.get(key) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) {
    return res.status(429).json({
      error: 'For mange forespørsler. Vent litt og prøv igjen om et minutt.',
    });
  }
  hits.push(now);
  rateStore.set(key, hits);
  next();
}

app.use('/api', apiRateLimit);

// ── Sider ─────────────────────────────────────────────────────────────────────
app.get('/',                (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/interview',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'interview.html')));
app.get('/session',         (req, res) => res.sendFile(path.join(__dirname, 'public', 'session.html')));
app.get('/bedriftsbibliotek',(req, res) => res.sendFile(path.join(__dirname, 'public', 'bedriftsbibliotek.html')));
app.get('/lonnskalkulator', (req, res) => res.sendFile(path.join(__dirname, 'public', 'lonnskalkulator.html')));
app.get('/soknadsbrev',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'soknadsbrev.html')));
app.get('/cv-analyse',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'cv-analyse.html')));
app.get('/priser',          (req, res) => res.sendFile(path.join(__dirname, 'public', 'priser.html')));

// ── Input-validering ──────────────────────────────────────────────────────────

/**
 * Validerer en tekststreng. Returnerer norsk feilmelding eller null.
 */
function validateText(val, label, maxLen = 8000) {
  if (!val || typeof val !== 'string') return `${label} mangler.`;
  if (!val.trim())                     return `${label} kan ikke være tom.`;
  if (val.length > maxLen)             return `${label} er for lang (maks ${maxLen} tegn).`;
  return null;
}

/**
 * Validerer samtalehistorikken (array av {role, content}).
 * Returnerer feilmelding eller null.
 */
function validateHistory(messages, maxMessages = 24) {
  if (!Array.isArray(messages))        return 'Samtalehistorikk mangler.';
  if (messages.length > maxMessages)   return 'Samtalehistorikk er for lang.';
  for (const m of messages) {
    if (!m || typeof m.role !== 'string' || typeof m.content !== 'string') {
      return 'Ugyldig meldingsformat i samtalehistorikk.';
    }
  }
  return null;
}

// ── Intervju-prompter ─────────────────────────────────────────────────────────

const EXP_LABELS = {
  student: 'student / nyutdannet',
  '1-3':   '1–3 års erfaring',
  '3-5':   '3–5 års erfaring',
  '5+':    '5+ års erfaring',
};

const STYLE_PROMPTS = {
  avslappet: 'Du er en vennlig og støttende HR-leder. Still enkle og åpne spørsmål. Vær oppmuntrende i tilbakemeldingene.',
  standard:  'Du er en profesjonell norsk HR-leder. Gjennomfør et normalt strukturert intervju.',
  krevende:  'Du er en krevende og direkte HR-direktør. Still tøffe oppfølgingsspørsmål. Utfordre svarene. Ikke godta vage svar — be om konkrete eksempler. Vær profesjonell men streng.',
};

const VALID_STYLES = new Set(Object.keys(STYLE_PROMPTS));
const VALID_EXP    = new Set(Object.keys(EXP_LABELS));

/**
 * Bygger system-prompten for intervju-endepunktene.
 * Både /api/interview/start, /api/interview/message og /api/interview/hint bruker denne.
 */
function buildSystemPrompt({ jobTitle, company, description, experience, interviewStyle = 'standard' }) {
  const style  = VALID_STYLES.has(interviewStyle) ? interviewStyle : 'standard';
  const expKey = VALID_EXP.has(experience) ? experience : null;

  return `${STYLE_PROMPTS[style]}

Du gjennomfører et realistisk jobbintervju for stillingen ${jobTitle} hos ${company}.
Kandidaten har: ${expKey ? EXP_LABELS[expKey] : experience}.

Stillingsbeskrivelse:
${description}

Norsk arbeidskultur du skal reflektere:
- Flat struktur og likeverd — ikke autoritær eller nedlatende
- Ærlighet og direkthet verdsettes, men alltid med respekt
- Balanse mellom jobb og fritid er viktig i Norge — det er greit å nevne
- Teamarbeid og samarbeid vektlegges høyt
- Norske arbeidsgivere ser etter selvstendige mennesker som tar initiativ
- Unngå amerikansk-stil hypet språk — vær jordnær og ekte
- Du og-form (ikke De) — uformell men profesjonell tone

Gjennomfør nøyaktig 5 intervjuspørsmål. Still ett spørsmål av gangen. Tilpass spørsmålene til stillingsbeskrivelsen og erfaringsnivået.

Start med å ønske kandidaten varmt velkommen på en uformell norsk måte, og still deretter ditt første spørsmål.

Etter det femte svaret trenger du ikke gi tilbakemelding — det håndteres separat. Bare takk kandidaten kort og si at du vil komme tilbake med tilbakemelding.

Still spørsmål naturlig slik en ekte HR-leder ville gjort i et norsk jobbintervju. Gå naturlig fra ett tema til neste uten å nummerere eller annonsere spørsmål. Bruk naturlige overganger som:
- 'Fortell meg litt om...'
- 'Jeg er også nysgjerrig på...'
- 'Da vil jeg gjerne høre...'
- 'La oss snakke litt om...'
- 'Hva tenker du om...'

Aldri si 'Spørsmål 1', 'Spørsmål 2', 'Da går vi videre til spørsmål' eller lignende. Samtalen skal flyte naturlig som et ekte intervju.

Vær konsis og effektiv i svarene dine:
- Tilbakemeldingen på hvert svar skal være maks 1-2 setninger
- Gå raskt videre til neste spørsmål
- Ikke bruk unødvendige høflighetsfraser mellom hvert spørsmål
- Velkomsthilsenen skal være maks 3 setninger
- Totalt svar fra deg skal aldri overstige 100 ord per melding

Snakk alltid norsk.`;
}

// ── API: Start intervju ───────────────────────────────────────────────────────
app.post('/api/interview/start', async (req, res) => {
  const { jobTitle, company, description, experience, interviewStyle } = req.body;

  // Valider alle påkrevde felt
  const err =
    validateText(jobTitle,     'Stillingstittel', 200)   ||
    validateText(company,      'Bedriftsnavn',    200)    ||
    validateText(description,  'Stillingsbeskrivelse', 8000) ||
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
});

// ── API: Neste melding i samtalen ─────────────────────────────────────────────
app.post('/api/interview/message', async (req, res) => {
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
});

// ── API: Strukturert tilbakemelding etter 5 spørsmål ─────────────────────────
app.post('/api/interview/feedback', async (req, res) => {
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
});

// ── API: Hint til neste svar ──────────────────────────────────────────────────
app.post('/api/interview/hint', async (req, res) => {
  const { jobTitle, company, description, experience, interviewStyle, messages } = req.body;

  const histErr = validateHistory(messages);
  if (histErr) return res.status(400).json({ error: histErr });

  try {
    const client   = new Anthropic();
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 150,
      system:     buildSystemPrompt({ jobTitle, company, description, experience, interviewStyle }),
      messages:   [
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
});

// ── API: Lønnskalkulator ──────────────────────────────────────────────────────
app.post('/api/lonnskalkulator', async (req, res) => {
  const { jobTitle, industry, experience, location, currentSalary } = req.body;

  const err =
    validateText(jobTitle,  'Stillingstittel', 200) ||
    validateText(industry,  'Bransje',         100) ||
    validateText(experience,'Erfaringsnivå',   100) ||
    validateText(location,  'Geografi',        100);
  if (err) return res.status(400).json({ error: err });

  // Valider valgfri lønn
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
});

// ── API: Søknadsbrev-generator ────────────────────────────────────────────────
app.post('/api/soknadsbrev', async (req, res) => {
  const { name, jobTitle, company, jobDescription, about } = req.body;

  const err =
    validateText(name,           'Navn',                   100)   ||
    validateText(jobTitle,       'Stillingstittel',         200)   ||
    validateText(company,        'Bedriftsnavn',            200)   ||
    validateText(jobDescription, 'Stillingsbeskrivelse',   6000)   ||
    validateText(about,          'Om deg selv',            3000);
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
});

// ── API: CV-analyse ───────────────────────────────────────────────────────────
app.post('/api/cv-analyse', upload.single('cv'), async (req, res) => {
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
});

// ── API: TTS — ElevenLabs ─────────────────────────────────────────────────────
app.post('/api/tts', async (req, res) => {
  const { text } = req.body;

  // API-nøkler forblir alltid på server-siden — sendes aldri til frontend
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
          model_id:      'eleven_turbo_v2_5',
          language_code: 'no',
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
    res.set('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (err) {
    logError('TTS:fetch', err);
    res.status(500).json({ error: 'Talesyntese feilet. Sjekk internettforbindelsen.' });
  }
});

// ── API: STT — OpenAI Whisper ─────────────────────────────────────────────────
app.post('/api/stt', audioUpload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Ingen lydfil mottatt.' });
  if (req.file.size < 1000) return res.status(400).json({ error: 'Lydfilen er for kort.' });

  
  try {
    // Bygger multipart form for Whisper API
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
});

/* ── Helsesjekk — viser status på alle API-tilkoblinger ─────────────────────
   Returnerer hvilke API-nøkler som er konfigurert (ikke selve nøklene!)
   og server-oppetid. Nyttig for å diagnostisere problemer raskt.
   ─────────────────────────────────────────────────────────────────────────── */
app.get('/health', (req, res) => {
  const keys = {
    anthropic:   !!process.env.ANTHROPIC_API_KEY,
    elevenlabs:  !!process.env.ELEVENLABS_API_KEY,
    openai:      !!process.env.OPENAI_API_KEY,
  };
  const allOk  = Object.values(keys).every(Boolean);
  const uptimeSec = Math.floor(process.uptime());
  res.status(allOk ? 200 : 206).json({
    status:  allOk ? 'ok' : 'degradert',
    app:     'Prepio',
    uptime:  `${uptimeSec}s`,
    version: process.env.npm_package_version || '1.0.0',
    apis:    keys,
  });
});

// ── Start server (kun ved direkte kjøring, ikke via Vercel) ──────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Prepio kjører på http://localhost:${PORT}`);
    const missing = REQUIRED_ENV.filter(k => !process.env[k]);
    if (missing.length) {
      console.warn(`⚠️  Mangler API-nøkler: ${missing.join(', ')} — noen funksjoner vil feile.`);
    }
  });
}

// Eksporter for Vercel serverless
module.exports = app;
