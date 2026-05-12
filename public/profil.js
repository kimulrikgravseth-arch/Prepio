/* ─── Profil-side: brukerinfo + historikk ─── */

function fmtDateNo(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('no-NO', { day: '2-digit', month: 'short', year: 'numeric' });
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
    else node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
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

  // Logg ut
  document.getElementById('logout-btn').onclick = async () => {
    try { await window.Clerk.signOut(); }
    finally { window.location.href = '/'; }
  };

  // Hent historikk
  const loadingEl = document.getElementById('history-loading');
  const emptyEl   = document.getElementById('history-empty');
  const listEl    = document.getElementById('history-list');

  try {
    const res = await authFetch('/api/profil/historikk');
    if (!res || !res.ok) throw new Error('Klarte ikke hente historikk');
    const data = await res.json();

    document.getElementById('stat-total').textContent = data.total ?? 0;
    document.getElementById('stat-avg').textContent   = data.total ? data.avgScore : '–';

    loadingEl.hidden = true;
    if (!data.sessions || data.sessions.length === 0) {
      emptyEl.hidden = false;
      return;
    }

    const top5 = data.sessions.slice(0, 5);
    listEl.hidden = false;
    listEl.innerHTML = '';

    top5.forEach((s, idx) => {
      const item = el('li', { class: 'history-item' });
      const meta = el('div', { class: 'history-meta' });

      const titleText = [s.jobTitle || 'Ukjent stilling', s.company].filter(Boolean).join(' · ');
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
  } catch (err) {
    loadingEl.hidden = true;
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

  const title = [session.jobTitle || 'Intervju', session.company].filter(Boolean).join(' · ');
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
