/* ── Tilstand ────────────────────────────────────────────────────────────── */
let selectedFile = null;

/* ── Init ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const dropzone   = document.getElementById('dropzone');
  const fileInput  = document.getElementById('file-input');
  const browseLink = document.getElementById('browse-link');
  const removeBtn  = document.getElementById('remove-file');
  const jobTitle   = document.getElementById('job-title');

  // Åpne filvelger
  browseLink.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
  dropzone.addEventListener('click',   () => { if (!selectedFile) fileInput.click(); });

  // Filvelger-endring
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) setFile(fileInput.files[0]);
  });

  // Dra-og-slipp
  dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  });

  // Fjern fil
  removeBtn.addEventListener('click', e => { e.stopPropagation(); clearFile(); });

  // Aktiver knapp ved tittel-inndata
  jobTitle.addEventListener('input', updateButton);

  // Start analyse
  document.getElementById('analyse-btn').addEventListener('click', runAnalysis);
});

/* ── Filhåndtering ───────────────────────────────────────────────────────── */
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function setFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    showToast('Kun PDF og Word-filer (.doc, .docx) støttes.', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('Filen er for stor — maks 10 MB.', 'error');
    return;
  }
  selectedFile = file;
  document.getElementById('file-name').textContent  = file.name;
  document.getElementById('file-selected').hidden   = false;
  document.getElementById('dropzone').classList.add('has-file');
  updateButton();
}

function clearFile() {
  selectedFile = null;
  document.getElementById('file-input').value       = '';
  document.getElementById('file-name').textContent  = '';
  document.getElementById('file-selected').hidden   = true;
  document.getElementById('dropzone').classList.remove('has-file');
  updateButton();
}

function updateButton() {
  const title = document.getElementById('job-title').value.trim();
  document.getElementById('analyse-btn').disabled = !selectedFile || !title;
}

/* ── Analyser CV ─────────────────────────────────────────────────────────── */
async function runAnalysis() {
  const btn   = document.getElementById('analyse-btn');
  const title = document.getElementById('job-title').value.trim();
  const desc  = document.getElementById('job-desc')?.value.trim() || '';

  setButtonLoading(btn, true);
  showView('loading');

  const formData = new FormData();
  formData.append('cv',             selectedFile);
  formData.append('jobTitle',       title);
  formData.append('jobDescription', desc);

  try {
    const res  = await fetch('/api/cv-analyse', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Noe gikk galt.');

    renderResults(data);
    showView('result');

    // Scroll til resultatet
    setTimeout(() => {
      document.getElementById('result-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  } catch (err) {
    showView('upload');
    setButtonLoading(btn, false);
    const msg = err.message.includes('429') || err.message.includes('mange')
      ? 'For mange forespørsler — vent litt og prøv igjen.'
      : err.message || 'Klarte ikke analysere CV-en. Sjekk internettforbindelsen.';
    showToast(msg, 'error');
  }
}

/* ── Rendrer resultater ──────────────────────────────────────────────────── */
function renderResults(data) {
  const container = document.getElementById('result-content');
  container.innerHTML = '';

  const score      = data.score || 0;
  const scoreColor = score >= 8 ? '#22C55E' : score >= 5 ? '#FC6A03' : '#EF4444';

  // Poengsumkort
  const scoreCard = el('div', 'score-card');
  scoreCard.innerHTML = `
    <div class="result-score-circle" style="--score-color:${scoreColor}">
      <span class="result-score-number">${score}</span>
      <span class="result-score-denom">/ 10</span>
    </div>
    <p class="score-summary">${escapeHtml(data.helhetsvurdering || '')}</p>`;
  container.appendChild(scoreCard);

  // Seksjoner
  const sections = [
    { key: 'sterke_sider',       cls: 'sec-sterke',  label: 'Sterke sider',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` },
    { key: 'forbedringspunkter', cls: 'sec-forbedre', label: 'Forbedringspunkter',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>` },
    { key: 'norsk_arbeidsmarked', cls: 'sec-norsk',   label: 'Norsk arbeidsmarked',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>` },
    { key: 'konkrete_endringer',  cls: 'sec-konkret', label: 'Gjør disse endringene nå',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>` },
  ];

  sections.forEach(({ key, cls, label, icon }) => {
    const items = data[key];
    if (!items?.length) return;
    const card = el('div', `result-section ${cls}`);
    card.innerHTML = `
      <div class="result-section-title"><span class="section-icon-wrap">${icon}</span>${label}</div>
      <ul class="result-list">${items.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`;
    container.appendChild(card);
  });

  // Tilbakestill-knapp
  document.getElementById('reset-btn').addEventListener('click', () => {
    clearFile();
    document.getElementById('job-title').value = '';
    const descEl = document.getElementById('job-desc');
    if (descEl) descEl.value = '';
    showView('upload');
  });
}

/* ── Byttvisning ─────────────────────────────────────────────────────────── */
function showView(name) {
  document.getElementById('upload-view').hidden  = name !== 'upload';
  document.getElementById('loading-view').hidden = name !== 'loading';
  document.getElementById('result-view').hidden  = name !== 'result';
  if (name === 'upload') window.scrollTo({ top: 0, behavior: 'smooth' });
}
