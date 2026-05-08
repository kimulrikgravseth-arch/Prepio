/* ============================================================
   utils.js — Delte hjelpefunksjoner for alle Prepio-sider
   Lastes inn FØR side-spesifikke skript i alle HTML-filer.
   ============================================================ */

/* ── Toast-varsel ────────────────────────────────────────────
   Viser en liten melding nederst på skjermen i 3 sekunder.
   Brukes over hele appen for feil og bekreftelser.
   ─────────────────────────────────────────────────────────── */
function showToast(message, type = 'default') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;

  const bg     = type === 'error'   ? '#991B1B'
               : type === 'success' ? '#166534'
               : '#0A1628';
  const border = type === 'error'   ? 'rgba(239,68,68,0.4)'
               : type === 'success' ? 'rgba(34,197,94,0.4)'
               : 'rgba(252,106,3,0.3)';

  Object.assign(toast.style, {
    position:     'fixed',
    bottom:       '32px',
    left:         '50%',
    transform:    'translateX(-50%) translateY(20px)',
    background:   bg,
    color:        '#fff',
    padding:      '14px 24px',
    borderRadius: '12px',
    fontSize:     '0.92rem',
    fontFamily:   "'Plus Jakarta Sans', sans-serif",
    fontWeight:   '600',
    border:       `1px solid ${border}`,
    boxShadow:    '0 8px 32px rgba(0,0,0,0.4)',
    zIndex:       '9999',
    opacity:      '0',
    transition:   'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    whiteSpace:   'nowrap',
    maxWidth:     'calc(100vw - 48px)',
    textAlign:    'center',
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity   = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(-50%) translateY(12px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/* ── XSS-beskyttelse ─────────────────────────────────────────
   Erstatter HTML-spesialtegn slik at brukerinput aldri
   kan injisere HTML/JS i DOM-en.
   ─────────────────────────────────────────────────────────── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── DOM-element-oppretter ───────────────────────────────────
   Enkel hjelper: lag et element med className satt.
   ─────────────────────────────────────────────────────────── */
function el(tag, className) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

/* ── Kopi til utklippstavle ──────────────────────────────────
   Kopierer tekst og gir visuell bekreftelse på knappen.
   btn:          <button>-elementet som utløste kopieringen
   successLabel: tekst å vise på knappen etter kopiering
   ─────────────────────────────────────────────────────────── */
async function copyToClipboard(text, btn, successLabel = 'Kopiert! ✓') {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const original = btn.textContent;
      btn.textContent = successLabel;
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 2500);
    }
    showToast('Kopiert til utklippstavlen', 'success');
  } catch {
    showToast('Kunne ikke kopiere — marker teksten manuelt.', 'error');
  }
}

/* ── Knapp-lasting ───────────────────────────────────────────
   Setter en knapp i lastestand (spinner + deaktivert)
   mens et API-kall pågår, slik at bruker ikke dobbelklikker.
   ─────────────────────────────────────────────────────────── */
function setButtonLoading(btn, loading, originalHTML) {
  if (!btn) return;
  if (loading) {
    btn.dataset.origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span><span>Laster...</span>`;
    btn.classList.add('btn-loading');
  } else {
    btn.disabled = false;
    btn.innerHTML = originalHTML || btn.dataset.origHtml || btn.innerHTML;
    btn.classList.remove('btn-loading');
  }
}

/* ── Tilbake-til-toppen-knapp ────────────────────────────────
   Viser en liten knapp nede til høyre etter scrolling,
   som tar brukeren tilbake til toppen av siden.
   ─────────────────────────────────────────────────────────── */
function setupBackToTop() {
  const btn = document.createElement('button');
  btn.className   = 'back-to-top';
  btn.title       = 'Tilbake til toppen';
  btn.setAttribute('aria-label', 'Tilbake til toppen');
  btn.innerHTML   = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="18 15 12 9 6 15"/>
  </svg>`;
  document.body.appendChild(btn);

  const toggle = () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  };
  window.addEventListener('scroll', toggle, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ── Hamburger-meny (mobil) ──────────────────────────────────
   Åpner og lukker navigasjonsmenyen på smale skjermer.
   ─────────────────────────────────────────────────────────── */
function setupHamburger() {
  const hamburger  = document.querySelector('.nav-hamburger');
  const navLinks   = document.querySelector('.nav-links');
  const navActions = document.querySelector('.nav-actions');
  if (!hamburger || !navLinks) return;

  const toggle = () => {
    const isOpen = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', String(!isOpen));
    hamburger.classList.toggle('open', !isOpen);
    navLinks.classList.toggle('mobile-open', !isOpen);
    navActions?.classList.toggle('mobile-open', !isOpen);
    document.body.classList.toggle('menu-open', !isOpen);
  };

  const close = () => {
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.classList.remove('open');
    navLinks.classList.remove('mobile-open');
    navActions?.classList.remove('mobile-open');
    document.body.classList.remove('menu-open');
  };

  hamburger.addEventListener('click', toggle);

  // Lukk ved klikk utenfor
  document.addEventListener('click', (e) => {
    if (!hamburger.closest('.nav-container').contains(e.target)) close();
  });

  // Lukk ved Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  // Lukk hvis vi navigerer via et lenke i menyen
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
}

/* ── Navbar-skygge ved scrolling ─────────────────────────────
   Felles logikk som alle sider bruker.
   ─────────────────────────────────────────────────────────── */
function setupNavbarShadow() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
}

/* ── Dropdown-meny (Verktøy) ─────────────────────────────────
   Håndterer hover + klikk + tastatur for Verktøy-dropdownen.
   ─────────────────────────────────────────────────────────── */
function setupDropdown() {
  const dropdown = document.querySelector('.nav-dropdown');
  if (!dropdown) return;
  const trigger = dropdown.querySelector('.nav-dropdown-trigger');
  const menu    = dropdown.querySelector('.nav-dropdown-menu');
  if (!trigger || !menu) return;

  const open  = () => { menu.classList.add('open'); trigger.setAttribute('aria-expanded', 'true'); };
  const close = () => { menu.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); };

  dropdown.addEventListener('mouseenter', open);
  dropdown.addEventListener('mouseleave', close);
  trigger.addEventListener('click', () => menu.classList.contains('open') ? close() : open());
  document.addEventListener('click', (e) => { if (!dropdown.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

/* ── Auto-initialisering ─────────────────────────────────────
   Kjøres på alle sider automatisk ved DOMContentLoaded.
   ─────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setupNavbarShadow();
  setupHamburger();
  setupDropdown();
  setupBackToTop();
});
