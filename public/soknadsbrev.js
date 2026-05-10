/* ── Init ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const fields = ['name', 'job-title', 'company', 'job-desc', 'about'];
  fields.forEach(id => document.getElementById(id).addEventListener('input', updateButton));

  document.getElementById('generate-btn').addEventListener('click', generate);
  document.getElementById('copy-btn').addEventListener('click', () => {
    const text = document.getElementById('letter-content').textContent;
    copyToClipboard(text, document.getElementById('copy-btn'), 'Kopiert! ✓');
  });
  document.getElementById('reset-btn').addEventListener('click', reset);
});

/* ── Aktiver/deaktiver generer-knapp ─────────────────────────────────────── */
function updateButton() {
  const allFilled = ['name', 'job-title', 'company', 'job-desc', 'about']
    .every(id => document.getElementById(id).value.trim() !== '');
  document.getElementById('generate-btn').disabled = !allFilled;
}

/* ── Generer søknadsbrev ─────────────────────────────────────────────────── */
async function generate() {
  const btn = document.getElementById('generate-btn');
  const payload = {
    name:           document.getElementById('name').value.trim(),
    jobTitle:       document.getElementById('job-title').value.trim(),
    company:        document.getElementById('company').value.trim(),
    jobDescription: document.getElementById('job-desc').value.trim(),
    about:          document.getElementById('about').value.trim(),
  };

  // Deaktiver knapp med spinner så bruker ikke dobbelklikker
  setButtonLoading(btn, true);
  showView('loading');

  try {
    const res  = await authFetch('/api/soknadsbrev', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Noe gikk galt.');

    document.getElementById('letter-content').textContent = data.letter;
    showView('result');

    // Scroll til resultatet etter en liten forsinkelse
    setTimeout(() => {
      document.getElementById('result-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  } catch (err) {
    showView('form');
    setButtonLoading(btn, false);
    const msg = err.message.includes('429') || err.message.includes('mange')
      ? 'For mange forespørsler — vent litt og prøv igjen.'
      : err.message || 'Klarte ikke generere brevet. Sjekk internettforbindelsen.';
    showToast(msg, 'error');
  }
}

/* ── Nullstill skjema ────────────────────────────────────────────────────── */
function reset() {
  ['name', 'job-title', 'company', 'job-desc', 'about'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('letter-content').textContent = '';
  const btn = document.getElementById('generate-btn');
  setButtonLoading(btn, false, 'Generer søknadsbrev →');
  updateButton();
  showView('form');
}

/* ── Byttvisning ─────────────────────────────────────────────────────────── */
function showView(name) {
  document.getElementById('form-view').hidden    = name !== 'form';
  document.getElementById('loading-view').hidden = name !== 'loading';
  document.getElementById('result-view').hidden  = name !== 'result';
  if (name === 'form') window.scrollTo({ top: 0, behavior: 'smooth' });
}
