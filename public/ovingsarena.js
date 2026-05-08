/* ============================================================
   ovingsarena.js — Øvingsarena klient-logikk
   ============================================================ */

const OPPONENTS = {
  salg:        ['Privatperson', 'Bedriftskunde', 'Skeptisk kunde', 'Svært interessert kunde'],
  pitching:    ['Norsk investor', 'Internasjonal investor', 'Bank', 'Familie og venner'],
  forhandling: ['Bilselger', 'Håndverker', 'Utleier', 'Leverandør', 'Arbeidsgiver'],
  kunde:       ['Misfornøyd kunde', 'Rasende kunde', 'Forvirret kunde', 'Kravstor kunde'],
};

const PLACEHOLDERS = {
  salg:        'Hva selger du? F.eks. bruktbil, forsikring, software',
  pitching:    'Hva pitcher du? F.eks. app-idé, restaurant, tech-startup',
  forhandling: 'Hva forhandler du om? F.eks. bilpris, husleie, håndverker',
  kunde:       'Hva handler samtalen om? F.eks. reklamasjon, forsinkelse, feil produkt',
};

const FORM_TITLES = {
  salg:        'Sett opp salgsøvingen',
  pitching:    'Sett opp pitchingen',
  forhandling: 'Sett opp forhandlingen',
  kunde:       'Sett opp kundesamtalen',
};

let selectedType = null;

document.addEventListener('DOMContentLoaded', () => {
  const cards      = document.querySelectorAll('.arena-card');
  const form       = document.getElementById('arena-form');
  const topicInput = document.getElementById('arena-topic');
  const opponentEl = document.getElementById('arena-opponent');
  const startBtn   = document.getElementById('start-arena-btn');
  const formTitle  = document.getElementById('form-title');

  /* ── Kort-klikk ─────────────────────────────────────────── */
  cards.forEach(card => {
    const activate = () => {
      const type = card.dataset.type;
      if (selectedType === type) return;
      selectedType = type;

      // Marker aktivt kort
      cards.forEach(c => {
        c.classList.toggle('active', c === card);
        c.setAttribute('aria-pressed', c === card ? 'true' : 'false');
      });

      // Oppdater skjema
      formTitle.textContent       = FORM_TITLES[type];
      topicInput.placeholder      = PLACEHOLDERS[type];
      topicInput.value            = '';
      startBtn.disabled           = true;

      // Fyll motpart-dropdown
      opponentEl.innerHTML = OPPONENTS[type]
        .map(o => `<option value="${o}">${o}</option>`)
        .join('');

      // Vis skjema
      form.removeAttribute('hidden');

      // Scroll til skjema
      setTimeout(() => {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        topicInput.focus();
      }, 50);
    };

    card.addEventListener('click', activate);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
  });

  /* ── Validering ─────────────────────────────────────────── */
  topicInput.addEventListener('input', () => {
    startBtn.disabled = topicInput.value.trim() === '';
  });

  /* ── Start øving ────────────────────────────────────────── */
  startBtn.addEventListener('click', () => {
    if (!selectedType || !topicInput.value.trim()) return;

    const params = new URLSearchParams({
      mode:       'arena',
      type:       selectedType,
      topic:      topicInput.value.trim(),
      opponent:   opponentEl.value,
      difficulty: document.getElementById('arena-difficulty').value,
    });

    window.location.href = `/session?${params.toString()}`;
  });
});
