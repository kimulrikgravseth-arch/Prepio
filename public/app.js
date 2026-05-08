document.addEventListener('DOMContentLoaded', () => {

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // CTA buttons → /interview
  const ctaStart = document.getElementById('cta-start');
  if (ctaStart) {
    ctaStart.addEventListener('click', () => {
      window.location.href = '/interview';
    });
  }

  // Card CTAs
  const cardRoutes = {
    'card-interview': '/interview',
    'card-cv':        '/cv-analyse',
    'card-letter':    '/soknadsbrev',
  };
  const cardToasts = {};

  Object.entries(cardRoutes).forEach(([id, href]) => {
    const card = document.getElementById(id);
    if (!card) return;
    const navigate = () => { window.location.href = href; };
    card.querySelector('.card-cta')?.addEventListener('click', e => { e.stopPropagation(); navigate(); });
    card.addEventListener('click', navigate);
  });

  Object.entries(cardToasts).forEach(([id, msg]) => {
    const card = document.getElementById(id);
    if (!card) return;
    card.querySelector('.card-cta')?.addEventListener('click', e => { e.stopPropagation(); showToast(msg); });
    card.addEventListener('click', () => showToast(msg));
  });

  // Nav buttons
  document.querySelectorAll('.btn-ghost').forEach(btn => {
    btn.addEventListener('click', () => showToast('Logg inn kommer snart!'));
  });

  // "Kom i gang" nav button → /interview
  document.querySelectorAll('.btn-primary:not(#cta-start)').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = '/interview';
    });
  });

  // "Se hvordan det fungerer"
  document.querySelectorAll('.btn-outline').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Intersection observer for staggered card reveal
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.card').forEach(card => {
    card.style.animationPlayState = 'paused';
    observer.observe(card);
  });


});
