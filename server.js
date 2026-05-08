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

/* ── Concurrency limiter — begrenser samtidige API-kall ─────────────────────
   Beskytter Claude og ElevenLabs mot overbelastning ved mange samtidige
   brukere. Køen holder forespørsler i minnet inntil en plass frigjøres.
   Hvis køen er full returneres 503 umiddelbart.
   ─────────────────────────────────────────────────────────────────────────── */
class ConcurrencyLimiter {
  constructor(max, maxQueue = 20) {
    this.max      = max;
    this.maxQueue = maxQueue;
    this.current  = 0;
    this.queue    = [];
  }

  run(fn) {
    if (this.current < this.max) {
      return this._exec(fn);
    }
    if (this.queue.length >= this.maxQueue) {
      const err = new Error('Tjenesten er for øyeblikket overbelastet. Prøv igjen om litt.');
      err.status = 503;
      return Promise.reject(err);
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject, fn });
    });
  }

  async _exec(fn) {
    this.current++;
    try {
      return await fn();
    } finally {
      this.current--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        this._exec(next.fn).then(next.resolve, next.reject);
      }
    }
  }
}

// Separate kø per ekstern tjeneste
const claudeLimiter     = new ConcurrencyLimiter(10, 30); // maks 10 samtidige Claude-kall
const elevenLabsLimiter = new ConcurrencyLimiter(5,  15); // maks 5 samtidige ElevenLabs-kall
const whisperLimiter    = new ConcurrencyLimiter(5,  15); // maks 5 samtidige Whisper-kall

/* ── Retry-logikk — prøver automatisk én gang til ved feil ──────────────────
   Gjelder kun nettverksfeil og 5xx-feil. Klientfeil (4xx) og
   overbelastning (503) gjentaes aldri.
   ─────────────────────────────────────────────────────────────────────────── */
async function withRetry(fn, maxRetries = 1, delayMs = 1200) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err.status || err.statusCode || (err.response?.status);
      // Ikke retry klientfeil eller overbelastning
      if (status >= 400 && status < 500) throw err;
      if (status === 503)                throw err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  throw lastErr;
}

/* ── Fetch med timeout — avbryter kall som tar over 30 sekunder ──────────────
   Brukes for alle utgående HTTP-kall (ElevenLabs, OpenAI Whisper).
   ─────────────────────────────────────────────────────────────────────────── */
const API_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('API-kallet tok for lang tid. Prøv igjen.');
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}


// ── Sider ─────────────────────────────────────────────────────────────────────
app.get('/',                (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/interview',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'interview.html')));
app.get('/session',         (req, res) => res.sendFile(path.join(__dirname, 'public', 'session.html')));
app.get('/bedriftsbibliotek',(req, res) => res.sendFile(path.join(__dirname, 'public', 'bedriftsbibliotek.html')));
app.get('/lonnskalkulator', (req, res) => res.sendFile(path.join(__dirname, 'public', 'lonnskalkulator.html')));
app.get('/soknadsbrev',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'soknadsbrev.html')));
app.get('/cv-analyse',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'cv-analyse.html')));
app.get('/priser',          (req, res) => res.sendFile(path.join(__dirname, 'public', 'priser.html')));
app.get('/ovingsarena',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'ovingsarena.html')));

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
  const style      = VALID_STYLES.has(interviewStyle) ? interviewStyle : 'standard';
  const expKey     = VALID_EXP.has(experience) ? experience : null;
  const hasCompany = company && company.trim();
  const hasDesc    = description && description.trim();

  // Bygg kontekst-setning tilpasset hva som er oppgitt
  const kontekst = hasCompany
    ? `Du gjennomfører et realistisk jobbintervju for stillingen ${jobTitle} hos ${hasCompany}.`
    : `Du gjennomfører et realistisk jobbintervju for stillingen ${jobTitle}. Bedriftsnavn er ikke oppgitt — unngå å nevne det.`;

  const beskrivelseSeksjon = hasDesc
    ? `Stillingsbeskrivelse:\n${hasDesc}`
    : `Stillingsbeskrivelse: Ikke oppgitt. Still generelle spørsmål som passer for en ${jobTitle} med ${expKey ? EXP_LABELS[expKey] : experience}.`;

  return `${STYLE_PROMPTS[style]}

${kontekst}
Kandidaten har: ${expKey ? EXP_LABELS[expKey] : experience}.

${beskrivelseSeksjon}

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

  // Kun stillingstittel og erfaringsnivå er påkrevd
  const err =
    validateText(jobTitle, 'Stillingstittel', 200) ||
    (!experience ? 'Erfaringsnivå mangler.' : null);
  if (err) return res.status(400).json({ error: err });

  // Valgfrie felt — valider kun lengde hvis de er oppgitt
  if (company && company.length > 200)
    return res.status(400).json({ error: 'Bedriftsnavn er for langt (maks 200 tegn).' });
  if (description && description.length > 8000)
    return res.status(400).json({ error: 'Stillingsbeskrivelse er for lang (maks 8000 tegn).' });

  try {
    const client   = new Anthropic();
    const response = await claudeLimiter.run(() =>
      withRetry(() => client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 512,
        system:     buildSystemPrompt({ jobTitle, company, description, experience, interviewStyle }),
        messages:   [{ role: 'user', content: 'Hei, jeg er klar for intervjuet.' }],
      }, { timeout: API_TIMEOUT_MS }))
    );
    res.json({ message: response.content[0].text });
  } catch (err) {
    const status = err.status || 500;
    logError('interview/start', err);
    res.status(status === 503 ? 503 : 500).json({
      error: status === 503
        ? err.message
        : status === 504
          ? 'Intervjuet tok for lang tid å starte. Prøv igjen.'
          : 'Klarte ikke starte intervjuet. Sjekk internettforbindelsen og prøv igjen.',
    });
  }
});

// ── API: Neste melding i samtalen ─────────────────────────────────────────────
app.post('/api/interview/message', async (req, res) => {
  const { jobTitle, company, description, experience, interviewStyle, messages } = req.body;

  const histErr = validateHistory(messages);
  if (histErr) return res.status(400).json({ error: histErr });

  try {
    const client   = new Anthropic();
    const response = await claudeLimiter.run(() =>
      withRetry(() => client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 512,
        system:     buildSystemPrompt({ jobTitle, company, description, experience, interviewStyle }),
        messages,
      }, { timeout: API_TIMEOUT_MS }))
    );
    res.json({ message: response.content[0].text });
  } catch (err) {
    const status = err.status || 500;
    logError('interview/message', err);
    res.status(status === 503 ? 503 : 500).json({
      error: status === 503
        ? err.message
        : status === 504
          ? 'Svaret tok for lang tid. Prøv igjen.'
          : 'Klarte ikke hente neste spørsmål. Sjekk internettforbindelsen og prøv igjen.',
    });
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
    const response = await claudeLimiter.run(() =>
      withRetry(() => client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 1024,
        system:     feedbackSystem,
        messages:   [...messages, { role: 'user', content: 'Gi meg den strukturerte tilbakemeldingen nå.' }],
      }, { timeout: API_TIMEOUT_MS }))
    );

    const text      = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI returnerte ugyldig format');

    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    const status = err.status || 500;
    logError('interview/feedback', err);
    res.status(status === 503 ? 503 : 500).json({
      error: status === 503 ? err.message : 'Klarte ikke generere tilbakemelding. Prøv igjen.',
    });
  }
});

// ── API: Hint til neste svar ──────────────────────────────────────────────────
app.post('/api/interview/hint', async (req, res) => {
  const { jobTitle, company, description, experience, interviewStyle, messages } = req.body;

  const histErr = validateHistory(messages);
  if (histErr) return res.status(400).json({ error: histErr });

  try {
    const client   = new Anthropic();
    const response = await claudeLimiter.run(() =>
      withRetry(() => client.messages.create({
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
      }, { timeout: API_TIMEOUT_MS }))
    );
    res.json({ hint: response.content[0].text.trim() });
  } catch (err) {
    const status = err.status || 500;
    logError('interview/hint', err);
    res.status(status === 503 ? 503 : 500).json({
      error: status === 503 ? err.message : 'Klarte ikke generere hint. Prøv igjen.',
    });
  }
});

// ── Øvingsarena: system-prompt builder ───────────────────────────────────────
const DIFFICULTY_MAP = {
  Lett: {
    salg:        'Du er åpen og interessert. Still enkle spørsmål og la deg overbevise relativt raskt.',
    pitching:    'Du er nysgjerrig og støttende. Still åpne spørsmål og gi oppmuntring.',
    forhandling: 'Du gir deg etter 1–2 gode argumenter.',
    kunde:       'Du er rimelig og forståelsesfull. Lar deg løse problemet.',
  },
  Middels: {
    salg:        'Du er litt skeptisk. Krev 2–3 gode argumenter før du vurderer kjøp.',
    pitching:    'Du er kritisk men fair. Fokuser på marked, konkurrenter og forretningsmodell.',
    forhandling: 'Du krever 2–3 solide argumenter. Gi deg gradvis.',
    kunde:       'Du er frustrert men lyttende. Krev konkrete løsninger.',
  },
  Krevende: {
    salg:        'Du er svært skeptisk. Pruter på pris, stiller tøffe spørsmål. La deg ikke overbevise lett.',
    pitching:    'Du er meget kritisk. Krev solide svar på økonomi, team og exit-strategi.',
    forhandling: 'Du holder hardt på posisjonen din. Gi deg kun ved eksepsjonelle argumenter.',
    kunde:       'Du er svært oppgitt. Truer med media og anmeldelse. Krev umiddelbar løsning.',
  },
};

function buildArenaPrompt(type, topic, opponent, difficulty) {
  const diff = DIFFICULTY_MAP[difficulty] || DIFFICULTY_MAP['Middels'];

  const prompts = {
    salg: `Du er en norsk kunde som vurderer å kjøpe: ${topic}.
Du spiller rollen som: ${opponent}.
${diff.salg}
Still ETT naturlig norsk spørsmål om gangen. Ikke gi lange svar.
Etter nøyaktig 5 utvekslinger avslutter du rollen og gir strukturert tilbakemelding:
TILBAKEMELDING:
- Hva fungerte bra (2–3 punkter)
- Hva kunne vært bedre (2–3 punkter)
- Score: X/10
- Ett konkret tips til neste salgssamtale
Svar alltid på norsk. Bryt aldri rollen før etter 5 utvekslinger.`,

    pitching: `Du er en erfaren ${opponent} som lytter til en pitch om: ${topic}.
${diff.pitching}
Still ETT kritisk spørsmål om gangen. Fokuser på: marked, konkurrenter, forretningsmodell, team, økonomi.
Etter nøyaktig 5 utvekslinger avslutter du rollen og gir investorfeedback:
INVESTORFEEDBACK:
- Hva var sterkt i pitchen (2–3 punkter)
- Hva må forbedres (2–3 punkter)
- Ville du investert? Hvorfor/hvorfor ikke?
- Score: X/10
Svar alltid på norsk. Bryt aldri rollen før etter 5 utvekslinger.`,

    forhandling: `Du er en ${opponent} i en forhandling om: ${topic}.
${diff.forhandling}
Start med en tydelig posisjon. Forhandle realistisk og naturlig.
Still ETT motspørsmål eller kom med ETT motargument om gangen.
Etter nøyaktig 5 utvekslinger avslutter du rollen og oppsummerer:
FORHANDLINGSOPPSUMMERING:
- Hvem fikk best deal og hvorfor
- Hvilke argumenter fungerte best
- 3 konkrete forhandlingstips
- Score: X/10
Svar alltid på norsk. Bryt aldri rollen før etter 5 utvekslinger.`,

    kunde: `Du er en ${opponent} med et problem knyttet til: ${topic}.
${diff.kunde}
Presenter problemet tydelig. Reager naturlig på svarene du får.
Etter nøyaktig 5 utvekslinger avslutter du rollen og gir tilbakemelding:
KUNDEBEHANDLING TILBAKEMELDING:
- Hva ble håndtert bra (2–3 punkter)
- Hva kunne vært bedre (2–3 punkter)
- Ble du fornøyd som kunde? Hvorfor/hvorfor ikke?
- Score: X/10
Svar alltid på norsk. Bryt aldri rollen før etter 5 utvekslinger.`,
  };

  return prompts[type] || prompts['salg'];
}

// ── API: Øvingsarena — start økt ─────────────────────────────────────────────
app.post('/api/arena/start', async (req, res) => {
  const { type, topic, opponent, difficulty } = req.body;
  if (!type || !topic) return res.status(400).json({ error: 'type og topic er påkrevd.' });

  const typeErr = validateText(topic, 'Topic', 300);
  if (typeErr) return res.status(400).json({ error: typeErr });

  try {
    const client   = new Anthropic();
    const response = await claudeLimiter.run(() =>
      withRetry(() => client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 512,
        system:     buildArenaPrompt(type, topic, opponent || '', difficulty || 'Middels'),
        messages:   [{ role: 'user', content: 'Hei, jeg er klar. La oss begynne.' }],
      }, { timeout: API_TIMEOUT_MS }))
    );
    res.json({ message: response.content[0].text });
  } catch (err) {
    logError('arena/start', err);
    res.status(500).json({ error: 'Klarte ikke starte øvingsarenaen. Prøv igjen.' });
  }
});

// ── API: Øvingsarena — neste melding ─────────────────────────────────────────
app.post('/api/arena/message', async (req, res) => {
  const { type, topic, opponent, difficulty, messages, messageCount } = req.body;
  if (!type || !topic) return res.status(400).json({ error: 'type og topic er påkrevd.' });

  const histErr = validateHistory(messages);
  if (histErr) return res.status(400).json({ error: histErr });

  try {
    const client   = new Anthropic();
    const response = await claudeLimiter.run(() =>
      withRetry(() => client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 512,
        system:     buildArenaPrompt(type, topic, opponent || '', difficulty || 'Middels'),
        messages,
      }, { timeout: API_TIMEOUT_MS }))
    );
    const isComplete = (messageCount || 0) >= 5;
    res.json({ message: response.content[0].text, isComplete });
  } catch (err) {
    logError('arena/message', err);
    res.status(500).json({ error: 'Klarte ikke hente svar. Prøv igjen.' });
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
    const response = await claudeLimiter.run(() =>
      withRetry(() => client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 2048,
        system:     systemPrompt,
        messages: [{
          role:    'user',
          content: `Stilling: ${jobTitle}\nBransje: ${industry}\nErfaring: ${experience}\nGeografi: ${location}${currentSalary ? `\nNåværende lønn: ${currentSalary} kr/mnd` : ''}`,
        }],
      }, { timeout: API_TIMEOUT_MS }))
    );

    const text      = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI returnerte ugyldig format');

    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    const status = err.status || 500;
    logError('lonnskalkulator', err);
    res.status(status === 503 ? 503 : 500).json({
      error: status === 503 ? err.message
           : status === 504 ? 'Beregningen tok for lang tid. Prøv igjen.'
           : 'Klarte ikke beregne lønn. Sjekk internettforbindelsen og prøv igjen.',
    });
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
    const response = await claudeLimiter.run(() =>
      withRetry(() => client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 1024,
        system:     systemPrompt,
        messages: [{
          role:    'user',
          content: `Navn: ${name}\nStilling: ${jobTitle}\nBedrift: ${company}\n\nStilingsbeskrivelse:\n${jobDescription}\n\nOm søkeren:\n${about}`,
        }],
      }, { timeout: API_TIMEOUT_MS }))
    );
    res.json({ letter: response.content[0].text.trim() });
  } catch (err) {
    const status = err.status || 500;
    logError('soknadsbrev', err);
    res.status(status === 503 ? 503 : 500).json({
      error: status === 503 ? err.message
           : status === 504 ? 'Genereringen tok for lang tid. Prøv igjen.'
           : 'Klarte ikke generere søknadsbrev. Sjekk internettforbindelsen og prøv igjen.',
    });
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
    const response = await claudeLimiter.run(() =>
      withRetry(() => client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 2048,
        system:     systemPrompt,
        messages: [{
          role:    'user',
          content: `Stilling: ${jobTitle}\n\nStilingsbeskrivelse:\n${jobDescription || 'Ikke oppgitt'}\n\nCV:\n${cvText.slice(0, 12000)}`,
        }],
      }, { timeout: API_TIMEOUT_MS }))
    );

    const text      = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI returnerte ugyldig format');

    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    const status = err.status || 500;
    logError('cv-analyse', err);
    res.status(status === 503 ? 503 : 500).json({
      error: status === 503 ? err.message
           : status === 504 ? 'Analysen tok for lang tid. Prøv igjen.'
           : 'Klarte ikke analysere CV-en. Sjekk internettforbindelsen og prøv igjen.',
    });
  }
});

// ── API: TTS — ElevenLabs ─────────────────────────────────────────────────────
app.post('/api/tts', async (req, res) => {
  const { text } = req.body;
  console.log('[TTS] ▶ Mottatt request, tekstlengde:', text?.length ?? 0);

  const err = validateText(text, 'Tekst', 1500);
  if (err) {
    console.log('[TTS] ✗ Validering feilet:', err);
    return res.status(400).json({ error: err });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'ErXwobaYiN019PkySvjV';
  const hasKey  = !!process.env.ELEVENLABS_API_KEY;
  console.log('[TTS] Voice ID:', voiceId, '| API-nøkkel satt:', hasKey);

  try {
    console.log('[TTS] → Sender til ElevenLabs...');
    const t0 = Date.now();

    const response = await elevenLabsLimiter.run(() =>
      withRetry(() => fetchWithTimeout(
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
      ))
    );

    const elapsed     = Date.now() - t0;
    const contentType = response.headers.get('content-type') || '(ingen)';
    console.log(`[TTS] ← ElevenLabs svarte: HTTP ${response.status} | Content-Type: ${contentType} | ${elapsed}ms`);

    if (!response.ok) {
      console.log('[TTS] ElevenLabs status:', response.status);
      console.log('[TTS] ElevenLabs headers:', Object.fromEntries(response.headers.entries()));
      const errorBody = await response.text();
      console.log('[TTS] ElevenLabs error body:', errorBody);
      logError('TTS:ElevenLabs', errorBody);
      return res.status(502).json({ error: 'Talesyntese feilet. Prøv igjen.' });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`[TTS] ✓ Lyd klar: ${audioBuffer.length} bytes, sender til frontend`);

    res.set('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
    console.log('[TTS] ✓ Response sendt');
  } catch (err) {
    const status = err.status || 500;
    console.log('[TTS] ✗ Exception:', err.name, err.message);
    logError('TTS:fetch', err);
    res.status(status === 503 ? 503 : status === 504 ? 504 : 500).json({
      error: status === 503 ? err.message
           : status === 504 ? 'Talesyntese tok for lang tid. Prøv igjen.'
           : 'Talesyntese feilet. Sjekk internettforbindelsen.',
    });
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

    const response = await whisperLimiter.run(() =>
      withRetry(() => fetchWithTimeout('https://api.openai.com/v1/audio/transcriptions', {
        method:  'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ''}` },
        body:    formData,
      }))
    );

    if (!response.ok) {
      const errBody = await response.text();
      logError('STT:Whisper', errBody);
      return res.status(502).json({ error: 'Transkripsjon feilet. Prøv igjen.' });
    }

    const data = await response.json();
    res.json({ transcript: data.text });
  } catch (err) {
    const status = err.status || 500;
    logError('STT:fetch', err);
    res.status(status === 503 ? 503 : status === 504 ? 504 : 500).json({
      error: status === 503 ? err.message
           : status === 504 ? 'Transkripsjon tok for lang tid. Prøv igjen.'
           : 'Transkripsjon feilet. Sjekk internettforbindelsen.',
    });
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
