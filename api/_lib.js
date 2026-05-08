/* ── Delte hjelpefunksjoner for alle API-handlere ────────────────────────────
   Denne filen eksporteres IKKE som en Vercel-rute (underscore-prefiks).
   ─────────────────────────────────────────────────────────────────────────── */
require('dotenv').config();

/* ── Feil-logger ─────────────────────────────────────────────────────────────
   I Vercel er filsystemet skrivebeskyttet utenom /tmp.
   Vi logger til console.error (vises i Vercel-loggene) og til /tmp/errors.log.
   ─────────────────────────────────────────────────────────────────────────── */
const fs   = require('fs');
const path = require('path');

const LOG_FILE = '/tmp/prepio-errors.log';

function logError(context, err) {
  const line = `[${new Date().toISOString()}] [${context}] ${err?.stack || err}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
  console.error(line.trimEnd());
}

/* ── Input-validering ────────────────────────────────────────────────────────
   Returnerer norsk feilmelding eller null hvis alt er OK.
   ─────────────────────────────────────────────────────────────────────────── */
function validateText(val, label, maxLen = 8000) {
  if (!val || typeof val !== 'string') return `${label} mangler.`;
  if (!val.trim())                     return `${label} kan ikke være tom.`;
  if (val.length > maxLen)             return `${label} er for lang (maks ${maxLen} tegn).`;
  return null;
}

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

/* ── In-memory rate limiter — maks 10 kall per minutt per IP ────────────────
   Deles innenfor én serverless-instans (beste-innsats på Vercel).
   ─────────────────────────────────────────────────────────────────────────── */
const RATE_LIMIT     = 10;
const RATE_WINDOW_MS = 60_000;
const rateStore      = new Map();

function checkRateLimit(req) {
  const ip  = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const hits = (rateStore.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) return false;
  hits.push(now);
  rateStore.set(ip, hits);
  return true;
}

/* ── Sikkerhetshoder ─────────────────────────────────────────────────────────
   Settes på alle API-svar.
   ─────────────────────────────────────────────────────────────────────────── */
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

module.exports = { logError, validateText, validateHistory, checkRateLimit, setSecurityHeaders };
