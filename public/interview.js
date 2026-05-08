document.addEventListener('DOMContentLoaded', () => {
  const form   = document.getElementById('interview-form');
  const btn    = document.getElementById('submit-btn');
  const title  = document.getElementById('job-title');
  const company = document.getElementById('company');
  const desc   = document.getElementById('description');
  const exp    = document.getElementById('experience');
  const style  = document.getElementById('interview-style');

  // Pre-fill company name if coming from bedriftsbibliotek
  const prefilledCompany = sessionStorage.getItem('prepioPrefilledCompany');
  if (prefilledCompany) {
    company.value = prefilledCompany;
    sessionStorage.removeItem('prepioPrefilledCompany');
    company.focus();
  }

  // Kun stillingstittel og erfaringsnivå er påkrevd
  const requiredFields = [title, exp];
  const allFields      = [title, company, desc, exp];

  function isFilled(el) {
    return el.value.trim() !== '' && !(el.tagName === 'SELECT' && el.value === '');
  }

  function updateButton() {
    btn.disabled = !requiredFields.every(isFilled);
  }

  allFields.forEach(el => {
    el.addEventListener('input', updateButton);
    el.addEventListener('change', updateButton);
  });

  // Fjern invalid-styling når bruker samhandler med feltet
  allFields.forEach(el => {
    el.addEventListener('focus', () => {
      el.classList.remove('invalid');
      el.closest('.select-wrapper')?.classList.remove('invalid');
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();

    // Marker tomme påkrevde felt
    let valid = true;
    requiredFields.forEach(el => {
      if (!isFilled(el)) {
        valid = false;
        if (el.tagName === 'SELECT') {
          el.closest('.select-wrapper').classList.add('invalid');
        } else {
          el.classList.add('invalid');
        }
      }
    });

    if (!valid) return;

    // Store data for the interview session
    const data = {
      jobTitle:       title.value.trim(),
      company:        company.value.trim(),
      description:    desc.value.trim(),
      experience:     exp.value,
      interviewStyle: style.value || 'standard',
    };
    sessionStorage.setItem('prepioInterview', JSON.stringify(data));
    window.location.href = '/session';
  });
});
