/* ── Init ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const requiredIds = ['job-title', 'industry', 'experience', 'location'];
  requiredIds.forEach(id => {
    document.getElementById(id).addEventListener('change', updateButton);
    document.getElementById(id).addEventListener('input',  updateButton);
  });

  document.getElementById('calc-btn').addEventListener('click', calculate);
  document.getElementById('reset-btn').addEventListener('click', reset);
});

function updateButton() {
  const filled = ['job-title', 'industry', 'experience', 'location']
    .every(id => document.getElementById(id).value.trim() !== '');
  document.getElementById('calc-btn').disabled = !filled;
}

/* ── Beregn lønn ─────────────────────────────────────────────────────────── */
async function calculate() {
  const btn     = document.getElementById('calc-btn');
  const payload = {
    jobTitle:      document.getElementById('job-title').value.trim(),
    industry:      document.getElementById('industry').value,
    experience:    document.getElementById('experience').value,
    location:      document.getElementById('location').value,
    currentSalary: document.getElementById('current-salary').value.trim(),
  };

  // Deaktiver knapp med spinner
  setButtonLoading(btn, true);
  showView('loading');

  try {
    const res  = await fetch('/api/lonnskalkulator', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Noe gikk galt.');

    renderResults(data, Number(payload.currentSalary) || 0, payload);
    showView('result');

    // Scroll til resultatet
    setTimeout(() => {
      document.getElementById('result-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  } catch (err) {
    showView('form');
    setButtonLoading(btn, false, 'Beregn lønn →');
    const msg = err.message.includes('429') || err.message.includes('mange')
      ? 'For mange forespørsler — vent litt og prøv igjen.'
      : err.message || 'AI er midlertidig utilgjengelig. Prøv igjen om litt.';
    showToast(msg, 'error');
  }
}

/* ── Render ──────────────────────────────────────────────────────────────── */
function renderResults(data, currentSalary, payload) {
  const container = document.getElementById('result-content');
  container.innerHTML = '';

  const lav    = data.lav    || 0;
  const hoy    = data.hoy    || 0;
  const median = data.median || Math.round((lav + hoy) / 2);

  // ── Salary hero ──
  const hero = el('div', 'salary-hero');
  hero.innerHTML = `
    <p class="salary-label">Estimert lønnsnivå — ${data.tittel || ''}</p>
    <div class="salary-range">
      <span class="salary-amount">${fmt(lav)}</span>
      <span class="salary-sep">–</span>
      <span class="salary-amount">${fmt(hoy)}</span>
    </div>
    <p class="salary-unit">kr per måned (brutto)</p>
    <div class="salary-median-wrap">
      <span class="median-badge">Median</span>
      <span class="median-amount">${fmt(median)} kr</span>
      <span class="median-label">/ mnd</span>
    </div>
    ${currentSalary ? buildBar(lav, hoy, currentSalary) : ''}
  `;
  container.appendChild(hero);

  // ── Lønnsutvikling ──
  if (data.utvikling) {
    const card = el('div', 'result-card rc-utvikling');
    card.innerHTML = `
      <div class="result-card-title">
        <span class="rc-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
          </svg>
        </span>
        Lønnsutvikling
      </div>
      <p class="result-card-text">${escapeHtml(data.utvikling)}</p>
    `;
    container.appendChild(card);
  }

  // ── Forhandlingstips ──
  if (data.forhandlingstips?.length) {
    const card = el('div', 'result-card rc-tips');
    const items = data.forhandlingstips.map(t => `<li>${escapeHtml(t)}</li>`).join('');
    card.innerHTML = `
      <div class="result-card-title">
        <span class="rc-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </span>
        Forhandlingstips
      </div>
      <ul class="result-list">${items}</ul>
    `;
    container.appendChild(card);
  }

  // ── Pass på ──
  if (data.pass_paa?.length) {
    const card = el('div', 'result-card rc-advarsel');
    const items = data.pass_paa.map(t => `<li>${escapeHtml(t)}</li>`).join('');
    card.innerHTML = `
      <div class="result-card-title">
        <span class="rc-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </span>
        Pass på dette
      </div>
      <ul class="result-list">${items}</ul>
    `;
    container.appendChild(card);
  }

  // ── Forhandlingsstrategi-seksjon ──
  if (data.strategi || data.vanlige_feil?.length || data.mental_forberedelse) {
    renderStrategiSeksjon(container, data);
  }

  // ── Kopieringsknapp for hele resultatet ──
  const copyWrap = el('div', 'lk-copy-wrap');
  const copyBtn  = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
    Kopier lønnsrapport`;
  copyBtn.addEventListener('click', () => {
    const summary = buildTextSummary(data, currentSalary);
    copyToClipboard(summary, copyBtn, 'Kopiert! ✓');
  });
  copyWrap.appendChild(copyBtn);
  container.appendChild(copyWrap);

  document.getElementById('reset-btn').addEventListener('click', reset);
}

/* ── Forhandlingsstrategi-seksjon ────────────────────────────────────────── */
function renderStrategiSeksjon(container, data) {
  const s = data.strategi || {};

  // ── Wrapper med oransje venstre-border ──
  const seksjon = el('div', 'strategi-seksjon');

  // Overskrift
  seksjon.innerHTML = `
    <div class="strategi-header">
      <span class="strategi-header-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      </span>
      Din personlige forhandlingsstrategi
    </div>
  `;

  // Steg-for-steg plan
  const stegData = [
    { label: 'Når tar du opp lønn?',         text: s.timing },
    { label: 'Ditt første ankerpunkt',        text: s.ankerpunkt },
    { label: 'Hva gjør du hvis de sier nei?', text: s.hvis_nei },
  ].filter(d => d.text);

  if (stegData.length) {
    const stegWrap = el('div', 'strategi-steg-liste');
    stegData.forEach((d, i) => {
      const steg = document.createElement('div');
      steg.className = 'strategi-steg';
      steg.innerHTML = `
        <div class="steg-nummer">${i + 1}</div>
        <div class="steg-innhold">
          <p class="steg-label">${escapeHtml(d.label)}</p>
          <p class="steg-tekst">${escapeHtml(d.text)}</p>
        </div>
      `;
      stegWrap.appendChild(steg);
    });
    seksjon.appendChild(stegWrap);
  }

  // Åpningsetninger
  if (s.aapningsetninger?.length) {
    const aDiv = el('div', 'strategi-aapning');
    aDiv.innerHTML = `<p class="strategi-sub-tittel">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      Slik åpner du lønnssamtalen
    </p>`;
    s.aapningsetninger.forEach(setning => {
      const q = document.createElement('div');
      q.className = 'aapning-setning';
      q.innerHTML = `<span class="aapning-sitat">"${escapeHtml(setning)}"</span>`;
      aDiv.appendChild(q);
    });
    seksjon.appendChild(aDiv);
  }

  // Andre goder
  if (s.andre_goder?.length) {
    const goderDiv = el('div', 'strategi-goder');
    const chips = s.andre_goder.map(g => `<span class="gode-chip">${escapeHtml(g)}</span>`).join('');
    goderDiv.innerHTML = `
      <p class="strategi-sub-tittel">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
        </svg>
        Andre goder du kan forhandle på
      </p>
      <div class="goder-chips">${chips}</div>
    `;
    seksjon.appendChild(goderDiv);
  }

  container.appendChild(seksjon);

  // ── Vanlige feil ──
  if (data.vanlige_feil?.length) {
    const feilCard = el('div', 'result-card rc-vanlige-feil');
    const items = data.vanlige_feil.map(f => `
      <li>
        <span class="feil-icon">⚠️</span>
        <span>${escapeHtml(f)}</span>
      </li>`).join('');
    feilCard.innerHTML = `
      <div class="result-card-title">
        <span class="rc-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </span>
        Vanlige feil i din situasjon
      </div>
      <ul class="feil-liste">${items}</ul>
    `;
    container.appendChild(feilCard);
  }

  // ── Mental forberedelse ──
  if (data.mental_forberedelse) {
    const pepCard = el('div', 'pep-talk-card');
    pepCard.innerHTML = `
      <div class="pep-talk-top">
        <span class="pep-talk-emoji">💪</span>
        <span class="pep-talk-tittel">Mental forberedelse</span>
      </div>
      <p class="pep-talk-tekst">${escapeHtml(data.mental_forberedelse)}</p>
    `;
    container.appendChild(pepCard);
  }
}

function buildBar(lav, hoy, current) {
  // Extend range 20% on each side for context
  const lo  = lav  * 0.8;
  const hi  = hoy  * 1.2;
  const span = hi - lo;

  const rangeLeft  = ((lav     - lo) / span * 100).toFixed(1);
  const rangeWidth = ((hoy - lav) / span * 100).toFixed(1);
  const curPos     = Math.min(Math.max((current - lo) / span * 100, 0), 100).toFixed(1);

  const diff     = current - Math.round((lav + hoy) / 2);
  const diffText = diff >= 0
    ? `+${fmt(diff)} kr over median`
    : `${fmt(Math.abs(diff))} kr under median`;
  const diffColor = diff >= 0 ? '#4ADE80' : '#FB923C';

  return `
    <div class="comparison-bar">
      <p class="comparison-label">Din nåværende lønn: <strong style="color:${diffColor}">${fmt(current)} kr</strong> (${diffText})</p>
      <div class="bar-track">
        <div class="bar-range"  style="left:${rangeLeft}%; width:${rangeWidth}%"></div>
        <div class="bar-current" style="left:${curPos}%"></div>
      </div>
      <p class="bar-current-label">▲ Din lønn</p>
    </div>`;
}

/* ── Hjelpere ────────────────────────────────────────────────────────────── */

/** Nullstill skjema og vis inndataskjerm igjen */
function reset() {
  ['job-title', 'current-salary'].forEach(id => {
    document.getElementById(id).value = '';
  });
  ['industry', 'experience', 'location'].forEach(id => {
    document.getElementById(id).selectedIndex = 0;
  });
  const btn = document.getElementById('calc-btn');
  setButtonLoading(btn, false, 'Beregn lønn →');
  updateButton();
  showView('form');
}

/** Bygger en ren tekstversjon av resultatet for kopiering */
function buildTextSummary(data, currentSalary) {
  const lines = [
    `Lønnsrapport — ${data.tittel || ''}`,
    `Lønnsnivå: ${fmt(data.lav)} – ${fmt(data.hoy)} kr/mnd`,
    `Median: ${fmt(data.median || Math.round((data.lav + data.hoy) / 2))} kr/mnd`,
    currentSalary ? `Din lønn: ${fmt(currentSalary)} kr/mnd` : '',
    '',
    data.utvikling ? `Lønnsutvikling:\n${data.utvikling}` : '',
  ];
  if (data.strategi) {
    const s = data.strategi;
    lines.push('', 'Forhandlingsstrategi:');
    if (s.timing)       lines.push(`Timing: ${s.timing}`);
    if (s.ankerpunkt)   lines.push(`Ankerpunkt: ${s.ankerpunkt}`);
    if (s.aapningsetninger?.length) {
      lines.push('Åpningsetninger:');
      s.aapningsetninger.forEach(x => lines.push(`  • "${x}"`));
    }
    if (s.hvis_nei)     lines.push(`Hvis nei: ${s.hvis_nei}`);
    if (s.andre_goder?.length) lines.push(`Andre goder: ${s.andre_goder.join(', ')}`);
  }
  if (data.mental_forberedelse) {
    lines.push('', `Mental forberedelse:\n${data.mental_forberedelse}`);
  }
  return lines.filter(l => l !== undefined).join('\n').trim();
}

function showView(name) {
  document.getElementById('form-view').hidden    = name !== 'form';
  document.getElementById('loading-view').hidden = name !== 'loading';
  document.getElementById('result-view').hidden  = name !== 'result';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


function fmt(n) {
  return Math.round(n).toLocaleString('nb-NO');
}


