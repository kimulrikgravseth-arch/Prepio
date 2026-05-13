/* ─── Profil-side: brukerinfo + faner + type-stats + historikk ─── */

const TYPE_LABELS = {
  all:         'Alle økter',
  intervju:    'Intervjuer',
  salg:        'Salgsøkter',
  pitching:    'Pitcher',
  forhandling: 'Forhandlinger',
  kunde:       'Kundesamtaler',
};

const EMPTY_MSG = {
  all:         'Du har ingen fullførte økter ennå. <a href="/interview">Start din første →</a>',
  intervju:    'Du har ikke gjennomført noen intervjuer ennå. <a href="/interview">Start din første økt!</a>',
  salg:        'Du har ikke gjennomført noen salgsøvinger ennå. <a href="/ovingsarena">Start din første økt!</a>',
  pitching:    'Du har ikke gjennomført noen pitcher ennå. <a href="/ovingsarena">Start din første økt!</a>',
  forhandling: 'Du har ikke gjennomført noen forhandlinger ennå. <a href="/ovingsarena">Start din første økt!</a>',
  kunde:       'Du har ikke gjennomført noen kundesamtaler ennå. <a href="/ovingsarena">Start din første økt!</a>',
};

let _historyData = null;     // hele {sessions, byType, stats}
let _activeType  = 'all';

function fmtDateNo(iso) {
  try {
    return new Date(iso).toLocaleDateString('no-NO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function scoreClass(score) {
  if (score == null) return 'gray';
  if (score >= 8) return 'green';
  if (score >= 5) return 'yellow';
  return 'red';
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'onclick') node.onclick = v;
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function statCard(value, label, opts = {}) {
  const card = el('div', { class: 'stat-card center' });
  const v    = el(opts.text ? 'div' : 'div', { class: opts.text ? 'stat-text' : 'stat-number' }, String(value));
  const l    = el('div', { class: 'stat-label' }, label);
  card.appendChild(v);
  card.appendChild(l);
  return card;
}

function renderStats(type) {
  const wrap = document.getElementById('profil-stats');
  wrap.innerHTML = '';

  const stats = _historyData?.stats?.[type] || {};
  const total = stats.total ?? 0;
  const avg   = total ? stats.avgScore : '–';
  const best  = total ? stats.bestScore : '–';

  const NA = '–';

  if (type === 'all') {
    wrap.appendChild(statCard(total, 'Totalt antall økter'));
    wrap.appendChild(statCard(total ? stats.avgScore : '–', 'Gjennomsnittlig score'));
    wrap.appendChild(statCard(total ? stats.bestScore : '–', 'Beste score'));
    wrap.appendChild(statCard(_historyData?.stats?.intervju?.total ?? 0, 'Intervjuer'));
    return;
  }

  if (type === 'intervju') {
    wrap.appendChild(statCard(total, 'Intervjuer gjennomført'));
    wrap.appendChild(statCard(avg,   'Gjennomsnittlig score'));
    wrap.appendChild(statCard(best,  'Beste score'));
    wrap.appendChild(statCard(stats.mostPracticed || NA, 'Mest øvde stilling', { text: true }));
    return;
  }

  if (type === 'salg') {
    wrap.appendChild(statCard(total, 'Salgsøkter'));
    wrap.appendChild(statCard(avg,   'Gjennomsnittlig score'));
    wrap.appendChild(statCard(stats.bestProduct   || NA, 'Beste produkt å selge', { text: true }));
    wrap.appendChild(statCard(stats.toughOpponent || NA, 'Mest krevende motpart', { text: true }));
    return;
  }

  if (type === 'pitching') {
    wrap.appendChild(statCard(total, 'Pitcher gjennomført'));
    wrap.appendChild(statCard(avg,   'Gj.snittlig investorscore'));
    wrap.appendChild(statCard(stats.bestTopic    || NA, 'Beste pitch-tema', { text: true }));
    wrap.appendChild(statCard(stats.bestInvestor || NA, 'Beste investor-type', { text: true }));
    return;
  }

  if (type === 'forhandling') {
    wrap.appendChild(statCard(total, 'Forhandlinger'));
    wrap.appendChild(statCard(avg,   'Gjennomsnittlig score'));
    wrap.appendChild(statCard(stats.bestType     || NA, 'Beste forhandlingstype', { text: true }));
    wrap.appendChild(statCard(stats.bestOpponent || NA, 'Beste motpart',          { text: true }));
    return;
  }

  if (type === 'kunde') {
    wrap.appendChild(statCard(total, 'Kundesamtaler'));
    wrap.appendChild(statCard(avg,   'Gjennomsnittlig score'));
    wrap.appendChild(statCard(best,  'Beste score'));
    wrap.appendChild(statCard(stats.toughestCustomer || NA, 'Vanskeligste kundetype', { text: true }));
    return;
  }
}

function renderList(type) {
  const titleEl   = document.getElementById('history-title');
  const loadingEl = document.getElementById('history-loading');
  const emptyEl   = document.getElementById('history-empty');
  const listEl    = document.getElementById('history-list');

  loadingEl.hidden = true;
  titleEl.textContent = type === 'all' ? 'Siste økter' : `Siste ${TYPE_LABELS[type].toLowerCase()}`;

  const all = _historyData?.sessions || [];
  const filtered = type === 'all' ? all : all.filter(s => s.type === type);

  listEl.innerHTML = '';
  if (!filtered.length) {
    emptyEl.hidden = false;
    emptyEl.innerHTML = EMPTY_MSG[type] || EMPTY_MSG.all;
    listEl.hidden = true;
    return;
  }

  emptyEl.hidden = true;
  listEl.hidden = false;

  filtered.slice(0, 5).forEach((s) => {
    const item = el('li', { class: 'history-item' });
    const meta = el('div', { class: 'history-meta' });

    const titleText = [s.jobTitle || 'Ukjent', s.company].filter(Boolean).join(' · ');
    meta.appendChild(el('p', { class: 'history-job' }, titleText));
    meta.appendChild(el('p', { class: 'history-date' }, fmtDateNo(s.date)));

    const badge = el('span', {
      class: `score-badge ${scoreClass(s.score)}`
    }, s.score != null ? `${s.score}/10` : '–');

    const detailBtn = el('button', {
      class: 'btn-detail',
      onclick: () => showDetail(s)
    }, 'Se detaljer');

    item.appendChild(meta);
    item.appendChild(badge);
    item.appendChild(detailBtn);
    listEl.appendChild(item);
  });
}

function setActiveTab(type) {
  _activeType = type;
  document.querySelectorAll('.profil-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.type === type);
  });
  renderStats(type);
  renderList(type);
}

async function initProfil() {
  const user = window.Clerk?.user;
  if (!user) return;

  const email   = user.primaryEmailAddress?.emailAddress || '';
  const name    = [user.firstName, user.lastName].filter(Boolean).join(' ') || email || 'Bruker';
  const initial = (user.firstName?.[0] || email[0] || 'B').toUpperCase();
  const created = user.createdAt ? new Date(user.createdAt) : null;

  document.getElementById('profil-avatar').textContent = initial;
  document.getElementById('profil-name').textContent   = name;
  document.getElementById('profil-email').textContent  = email;
  document.getElementById('profil-since').textContent  = created
    ? `Medlem siden ${fmtDateNo(created.toISOString())}`
    : '';

  document.getElementById('logout-btn').onclick = async () => {
    try { await window.Clerk.signOut(); }
    finally { window.location.href = '/'; }
  };

  // Faner
  document.querySelectorAll('.profil-tab').forEach(tab => {
    tab.addEventListener('click', () => setActiveTab(tab.dataset.type));
  });

  // Hent historikk
  try {
    const res = await authFetch('/api/profil/historikk');
    if (!res || !res.ok) throw new Error('Klarte ikke hente historikk');
    _historyData = await res.json();
    setActiveTab('all');
  } catch (err) {
    document.getElementById('history-loading').hidden = true;
    const emptyEl = document.getElementById('history-empty');
    emptyEl.hidden = false;
    emptyEl.textContent = 'Klarte ikke hente historikk. Prøv igjen senere.';
    console.error('[profil] historikk feilet:', err);
  }
}

function showDetail(session) {
  const overlay = document.getElementById('detail-overlay');
  const content = document.getElementById('detail-content');
  const fb      = session.feedback || {};

  content.className = 'detail-content';
  content.innerHTML = '';

  const title = [session.jobTitle || 'Økt', session.company].filter(Boolean).join(' · ');
  content.appendChild(el('h3', {}, title));
  content.appendChild(el('p', { class: 'detail-sub' }, fmtDateNo(session.date)));

  const badge = el('span', {
    class: `score-badge ${scoreClass(session.score)}`,
    style: 'display:inline-block; margin-bottom:16px;'
  }, session.score != null ? `Score: ${session.score}/10` : 'Ingen score');
  content.appendChild(badge);

  if (fb.intro) {
    const p = el('p', {}, fb.intro);
    p.style.marginBottom = '16px';
    content.appendChild(p);
  }

  if (Array.isArray(fb.bra) && fb.bra.length) {
    const sec = el('div', { class: 'detail-section' });
    sec.appendChild(el('h4', {}, 'Hva som gikk bra'));
    const ul = el('ul');
    fb.bra.forEach(b => ul.appendChild(el('li', {}, b)));
    sec.appendChild(ul);
    content.appendChild(sec);
  }

  if (Array.isArray(fb.forbedring) && fb.forbedring.length) {
    const sec = el('div', { class: 'detail-section' });
    sec.appendChild(el('h4', {}, 'Til forbedring'));
    const ul = el('ul');
    fb.forbedring.forEach(b => ul.appendChild(el('li', {}, b)));
    sec.appendChild(ul);
    content.appendChild(sec);
  }

  if (fb.avslutning) {
    const p = el('p', {}, fb.avslutning);
    p.style.marginTop = '16px';
    p.style.color = '#444';
    content.appendChild(p);
  }

  overlay.hidden = false;
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('detail-overlay');
  document.getElementById('detail-close')?.addEventListener('click', () => overlay.hidden = true);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.hidden = true;
  });
});
