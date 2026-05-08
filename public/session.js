/* ── Tilstand ──────────────────────────────────────────────────────────────── */
let interviewData  = null;
let history        = [];
let questionCount  = 0;
let isDone         = false;

// Stemmetilstand: 'idle' | 'ready' | 'recording' | 'processing'
let voiceState       = 'idle';
let mediaRecorder    = null;
let audioChunks      = [];
let recordStart      = 0;
let micStream        = null;

// TTS — HTMLAudioElement (Safari-kompatibelt)
let currentAudio     = null;   // aktiv Audio-element — kan stoppes
let pendingAudioUrl  = null;   // blob URL klar til avspilling

// Visualiserer (AudioContext kun for bølgeform under opptak)
let audioCtx         = null;
let analyser         = null;
let analyserSrc      = null;
let animFrameId      = null;

// Hint
let hintUsed         = false;

// Event-lyttere lagret slik at de kan fjernes i finishInterview()
let _micBtnHandler   = null;
let _avbrytHandler   = null;
let _hintHandler     = null;

/* ── Hjelper ──────────────────────────────────────────────────────────────── */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/* ── Init ─────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Hent intervju-data fra sessionStorage — redirect hvis ingenting er lagret
  const raw = sessionStorage.getItem('prepioInterview');
  if (!raw) { window.location.href = '/interview'; return; }

  try {
    interviewData = JSON.parse(raw);
  } catch {
    // Ugyldig JSON — send tilbake til intervju-skjemaet
    window.location.href = '/interview';
    return;
  }

  document.getElementById('session-title').textContent = interviewData.company
    ? `${interviewData.jobTitle} hos ${interviewData.company}`
    : interviewData.jobTitle;

  await requestMic();
  startInterview();
});

/* ── AudioContext ─────────────────────────────────────────────────────────── */
// Oppretter/gjenoppretter AudioContext ved brukerinteraksjon (krav i nettlesere)
function unlockAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    console.log('[Audio] AudioContext opprettet, tilstand:', audioCtx.state);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => console.log('[Audio] AudioContext gjenopptatt'));
  }
}

/* ── Mikrofontilgang ──────────────────────────────────────────────────────── */
async function requestMic() {
  setStatus('Ber om mikrofontilgang...');
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('[Mic] Tilgang gitt');
  } catch (err) {
    console.warn('[Mic] Tilgang nektet:', err.message);
    showMicError();
  }
}

function showMicError() {
  setStatus('Mikrofon ble nektet — sjekk nettleserinnstillingene dine');
  const btn = document.getElementById('mic-btn');
  btn.className = 'mic-btn mic-disabled';
  btn.disabled  = true;
}

/* ── Stemme-tilstandsmaskin ───────────────────────────────────────────────── */
function setVoiceState(state) {
  voiceState = state;
  updateMicUI();
}

function updateMicUI() {
  const btn       = document.getElementById('mic-btn');
  const hint      = document.getElementById('mic-hint');
  const avbrytBtn = document.getElementById('avbryt-btn');
  if (!btn) return;

  btn.className = 'mic-btn';

  switch (voiceState) {
    case 'idle':
      btn.className += ' mic-disabled';
      btn.disabled   = true;
      setStatus('Kobler til...');
      hint.textContent = '';
      break;
    case 'ready':
      btn.className += ' mic-ready';
      btn.disabled   = false;
      setStatus('Klar for svar');
      hint.textContent = 'Trykk for å starte opptak';
      break;
    case 'recording':
      btn.className += ' mic-recording';
      btn.disabled   = false;
      setStatus('Tar opp...');
      hint.textContent = 'Trykk for å stoppe og sende';
      break;
    case 'processing':
      btn.className += ' mic-processing';
      btn.disabled   = true;
      setStatus('Behandler...');
      hint.textContent = '';
      break;
  }

  // Avbryt-knapp styres direkte av playPendingAudio(), ikke av voiceState

  // Hint-knapp: kun synlig når klar og hint ikke brukt for dette spørsmålet
  const hintBtn = document.getElementById('hint-btn');
  if (hintBtn) {
    if (voiceState === 'ready' && !hintUsed) {
      hintBtn.removeAttribute('hidden');
    } else {
      hintBtn.setAttribute('hidden', '');
    }
  }
}

/* ── Mic-knapp — trykk for å veksle ──────────────────────────────────────── */
function setupMicButton() {
  const btn       = document.getElementById('mic-btn');
  const avbrytBtn = document.getElementById('avbryt-btn');
  const hintBtn   = document.getElementById('hint-btn');

  const listenBtn = document.getElementById('listen-btn');

  // Lagre referanser for opprydding i finishInterview()
  _micBtnHandler = () => {
    unlockAudio();
    // Hopp over ventende lyd hvis bruker velger å svare direkte
    if (pendingAudioUrl) {
      URL.revokeObjectURL(pendingAudioUrl);
      pendingAudioUrl = null;
    }
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    hideListenBtn();
    if (voiceState === 'ready')          startRecording();
    else if (voiceState === 'recording') stopRecording();
  };

  _avbrytHandler = () => {
    // Stopp pågående TTS-avspilling
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    if (pendingAudioUrl) { URL.revokeObjectURL(pendingAudioUrl); pendingAudioUrl = null; }
    hideListenBtn();
    avbrytBtn.setAttribute('hidden', '');
  };

  _hintHandler = fetchHint;

  btn.addEventListener('click', _micBtnHandler);
  avbrytBtn.addEventListener('click', _avbrytHandler);
  hintBtn.addEventListener('click', _hintHandler);
  if (listenBtn) listenBtn.addEventListener('click', playPendingAudio);
}

/* ── Hint ─────────────────────────────────────────────────────────────────── */
async function fetchHint() {
  // Merk hint som brukt og skjul knappen umiddelbart
  hintUsed = true;
  updateMicUI();

  const hintBox  = document.getElementById('hint-box');
  const hintText = document.getElementById('hint-text');

  hintBox.removeAttribute('hidden');
  hintText.textContent = 'Henter hint...';

  setVoiceState('idle'); // deaktiver mic mens hint hentes

  try {
    const res  = await fetch('/api/interview/hint', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...interviewData, messages: history }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Klarte ikke hente hint');

    hintText.textContent = data.hint;
    prepareTTS(data.hint);
  } catch (err) {
    console.error('[Hint] Feil:', err);

    const online = navigator.onLine;
    hintText.textContent = online
      ? 'Klarte ikke hente hint. Prøv igjen.'
      : 'Ingen internettforbindelse. Sjekk tilkoblingen din.';

    // Tillat nytt forsøk ved å nullstille hintUsed
    hintUsed = false;
    setVoiceState('ready');
  }
}

// Tilbakestill hint-tilstand for hvert nye spørsmål
function resetHint() {
  hintUsed = false;
  const hintBox = document.getElementById('hint-box');
  if (hintBox) hintBox.setAttribute('hidden', '');
  const hintText = document.getElementById('hint-text');
  if (hintText) hintText.textContent = '';
  // updateMicUI() vil vise hint-btn igjen når tilstanden går til 'ready'
}

/* ── Opptak ───────────────────────────────────────────────────────────────── */
function startRecording() {
  if (!micStream) return;

  audioChunks = [];
  recordStart = Date.now();

  // Velg beste støttede lydformat
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/mp4')
    ? 'audio/mp4'
    : '';

  mediaRecorder = new MediaRecorder(micStream, mimeType ? { mimeType } : {});

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    stopVisualization();
    const duration = Date.now() - recordStart;
    console.log(`[Rec] Stoppet etter ${duration}ms`);

    // Ignorer opptak kortere enn 500ms (utilsiktet trykk)
    if (duration < 500) { setVoiceState('ready'); return; }

    const type = mediaRecorder.mimeType || 'audio/webm';
    const blob = new Blob(audioChunks, { type });
    console.log(`[Rec] Blob: ${blob.size} bytes`);
    setVoiceState('processing');
    await transcribe(blob);
  };

  mediaRecorder.start(100);
  setVoiceState('recording');
  startVisualization();
  console.log('[Rec] Startet, mimeType:', mediaRecorder.mimeType);
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

/* ── Bølgeformvisualiserer ────────────────────────────────────────────────── */
function startVisualization() {
  if (!micStream || !audioCtx) return;

  // Koble mikrofon-stream til AnalyserNode for frekvensmåling
  analyserSrc = audioCtx.createMediaStreamSource(micStream);
  analyser    = audioCtx.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.75;
  analyserSrc.connect(analyser);

  const waveform  = document.getElementById('waveform');
  const bars      = waveform ? [...waveform.querySelectorAll('.bar')] : [];
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const binSlice  = Math.floor(analyser.frequencyBinCount / bars.length);

  if (waveform) waveform.classList.add('active');

  function draw() {
    animFrameId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    bars.forEach((bar, i) => {
      // Sample stemmefrekvenser (ca. 80–4000 Hz)
      const start = 1 + i * binSlice;
      let sum = 0;
      for (let j = start; j < start + binSlice; j++) sum += dataArray[j] || 0;
      const avg    = sum / binSlice;
      const height = 4 + (avg / 255) * 28;
      bar.style.height = `${height}px`;
    });
  }
  draw();
}

function stopVisualization() {
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  if (analyser)    { analyser.disconnect();    analyser    = null; }
  if (analyserSrc) { analyserSrc.disconnect(); analyserSrc = null; }

  const waveform = document.getElementById('waveform');
  if (waveform) {
    waveform.classList.remove('active');
    waveform.querySelectorAll('.bar').forEach(b => { b.style.height = '4px'; });
  }
}

/* ── Tale-til-tekst ───────────────────────────────────────────────────────── */
async function transcribe(blob) {
  console.log('[STT] Sender til /api/stt...');
  try {
    const form = new FormData();
    form.append('audio', blob, 'audio.webm');

    const res  = await fetch('/api/stt', { method: 'POST', body: form });
    const data = await res.json();

    console.log('[STT] Respons:', res.status, data);
    if (!res.ok) throw new Error(data.error || 'Transkripsjon feilet');

    const transcript = (data.transcript || '').trim();
    if (!transcript) {
      // Ingen gjenkjent tale — la brukeren prøve igjen
      console.warn('[STT] Tom transkripsjon');
      setVoiceState('ready');
      return;
    }

    await sendMessage(transcript);
  } catch (err) {
    console.error('[STT] Feil:', err);
    const online = navigator.onLine;
    setStatus(online
      ? 'Klarte ikke transkribere. Prøv igjen.'
      : 'Ingen internettforbindelse. Sjekk tilkoblingen din.');
    setVoiceState('ready');
  }
}

/* ── Tekst-til-tale ───────────────────────────────────────────────────────── */
// Fjern markdown-formatering før TTS (ElevenLabs leser ikke markdown pent)
function stripMarkdown(text) {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

/* ── Listen-knapp hjelpere ────────────────────────────────────────────────── */
function showListenBtn(state) {
  const btn = document.getElementById('listen-btn');
  if (!btn) return;
  btn.removeAttribute('hidden');
  if (state === 'loading') {
    btn.disabled = true;
    btn.innerHTML = '<span style="opacity:.5">⏳ Laster lyd...</span>';
  } else if (state === 'ready') {
    btn.disabled = false;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Hør spørsmålet';
  } else if (state === 'playing') {
    btn.disabled = true;
    btn.innerHTML = '🔊 Spiller av...';
  }
}

function hideListenBtn() {
  const btn = document.getElementById('listen-btn');
  if (btn) btn.setAttribute('hidden', '');
}

/* ── Hent lyd fra ElevenLabs og gjør klar (ikke spill av ennå) ──────────── */
async function prepareTTS(text) {
  const cleanText = stripMarkdown(text);
  if (!cleanText) return;

  // Rydd opp forrige ventende lyd
  if (pendingAudioUrl) { URL.revokeObjectURL(pendingAudioUrl); pendingAudioUrl = null; }

  showListenBtn('loading');
  console.log('[TTS] Henter lyd, lengde:', cleanText.length);

  try {
    const res = await fetch('/api/tts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text: cleanText }),
    });

    if (!res.ok) {
      console.warn('[TTS] API-feil:', res.status);
      hideListenBtn();
      return;
    }

    const blob = await res.blob();
    pendingAudioUrl = URL.createObjectURL(blob);
    console.log('[TTS] Blob klar, bytes:', blob.size);
    showListenBtn('ready');

  } catch (err) {
    console.error('[TTS] Feil ved henting:', err.message);
    hideListenBtn();
  }
}

/* ── Spill av lyd ved direkte brukertrykk (Safari-kompatibelt) ───────────── */
async function playPendingAudio() {
  if (!pendingAudioUrl) return;

  const url = pendingAudioUrl;
  pendingAudioUrl = null;

  showListenBtn('playing');
  const avbrytBtn = document.getElementById('avbryt-btn');
  if (avbrytBtn) avbrytBtn.removeAttribute('hidden');

  currentAudio = new Audio(url);
  currentAudio.playsinline = true;
  currentAudio.setAttribute('playsinline', '');

  await new Promise((resolve) => {
    currentAudio.onended = () => { console.log('[TTS] Avspilling ferdig'); resolve(); };
    currentAudio.onerror = (e) => { console.error('[TTS] Avspilling feilet:', e); resolve(); };
    currentAudio.play().catch((err) => { console.error('[TTS] play() nektet:', err); resolve(); });
  });

  currentAudio = null;
  URL.revokeObjectURL(url);
  hideListenBtn();
  if (avbrytBtn) avbrytBtn.setAttribute('hidden', '');
}

/* ── API-kall ─────────────────────────────────────────────────────────────── */
// Start intervjuet — henter velkomstspørsmål fra Claude
async function startInterview() {
  setVoiceState('idle');
  showTyping();

  try {
    const res  = await fetch('/api/interview/start', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(interviewData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ukjent feil');

    history.push({ role: 'user',      content: 'Hei, jeg er klar for intervjuet.' });
    history.push({ role: 'assistant', content: data.message });

    removeTyping();
    appendBubble('ai', data.message);
    questionCount = 1;
    updateCounter();

    setupMicButton();
    setVoiceState('ready');
    prepareTTS(data.message);
  } catch (err) {
    removeTyping();
    const online = navigator.onLine;
    appendBubble('ai', online
      ? `Feil: ${err.message}`
      : 'Ingen internettforbindelse. Sjekk tilkoblingen din og last siden på nytt.');
    setVoiceState('ready');
  }
}

// Send brukerens svar og hent neste spørsmål (eller avsluttende tilbakemelding)
async function sendMessage(userText) {
  history.push({ role: 'user', content: userText });
  appendBubble('user', userText);
  setVoiceState('idle');

  // Naturlig pause før Claude kalles — simulerer at intervjueren tenker
  await delay(1500);

  showTyping();
  const isFinalQuestion = questionCount >= 5;

  try {
    if (isFinalQuestion) {
      // Siste spørsmål: hent avslutningsmelding, deretter generér tilbakemelding
      const msgRes  = await fetch('/api/interview/message', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...interviewData, messages: history }),
      });
      const msgData = await msgRes.json();
      if (!msgRes.ok) throw new Error(msgData.error || 'Ukjent feil');

      history.push({ role: 'assistant', content: msgData.message });
      removeTyping();
      appendBubble('ai', msgData.message);
      prepareTTS(msgData.message);

      // Generer tilbakemeldingskort
      showTyping();
      const fbRes  = await fetch('/api/interview/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...interviewData, messages: history }),
      });
      const feedback = await fbRes.json();
      if (!fbRes.ok) throw new Error(feedback.error || 'Ukjent feil');

      removeTyping();
      renderFeedbackCard(feedback);
      finishInterview();

    } else {
      // Hent neste spørsmål
      const res  = await fetch('/api/interview/message', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...interviewData, messages: history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ukjent feil');

      history.push({ role: 'assistant', content: data.message });
      removeTyping();
      appendBubble('ai', data.message);
      questionCount++;
      updateCounter();
      resetHint(); // nytt spørsmål — hint tilgjengelig igjen
      setVoiceState('ready');
      prepareTTS(data.message);
    }
  } catch (err) {
    removeTyping();
    const online = navigator.onLine;
    appendBubble('ai', online
      ? `Feil: ${err.message}`
      : 'Ingen internettforbindelse. Sjekk tilkoblingen din.');
    setVoiceState('ready');
  }
}

/* ── UI-hjelpere ──────────────────────────────────────────────────────────── */
function setStatus(text) {
  const el = document.getElementById('mic-status');
  if (el) el.textContent = text;
}

// Legg til en ny chat-boble (AI eller bruker)
function appendBubble(role, text) {
  const chatInner = document.getElementById('chat-inner');

  const row = document.createElement('div');
  row.className = `bubble-row ${role}`;

  if (role === 'ai') {
    const avatar = document.createElement('div');
    avatar.className = 'ai-avatar';
    avatar.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>`;
    row.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = `bubble ${role}`;
  // AI-meldinger rendres som markdown; brukermeldinger vises som ren tekst
  bubble.innerHTML = role === 'ai' ? marked.parse(text) : '';
  if (role !== 'ai') bubble.textContent = text;
  row.appendChild(bubble);

  chatInner.appendChild(row);
  scrollToBottom();
}

// Bygg og vis tilbakemeldingskort etter siste spørsmål
function renderFeedbackCard(f) {
  const chatInner = document.getElementById('chat-inner');

  const scoreColor      = f.score >= 8 ? '#22C55E' : f.score >= 5 ? '#2563EB' : '#EF4444';
  const braItems        = (f.bra       || []).map(p => `<li>${escapeHtml(p)}</li>`).join('');
  const forbedringItems = (f.forbedring || []).map(p => `<li>${escapeHtml(p)}</li>`).join('');

  const card = document.createElement('div');
  card.className = 'feedback-card';
  card.innerHTML = `
    <div class="feedback-score-wrap">
      <div class="score-circle" style="--score-color: ${scoreColor}">
        <span class="score-number">${f.score}</span>
        <span class="score-denom">/ 10</span>
      </div>
      <p class="score-intro">${escapeHtml(f.intro || '')}</p>
    </div>
    <div class="feedback-sections">
      <div class="feedback-section feedback-bra">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Hva du gjorde bra
        </h3>
        <ul>${braItems}</ul>
      </div>
      <div class="feedback-section feedback-forbedring">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
          Hva du kan forbedre
        </h3>
        <ul>${forbedringItems}</ul>
      </div>
    </div>
    <p class="feedback-avslutning">${escapeHtml(f.avslutning || '')}</p>
    <div class="feedback-actions">
      <a href="/interview" class="btn btn-primary btn-large">Øv igjen</a>
      <a href="/" class="btn btn-outline btn-large">Gå til forsiden</a>
    </div>
  `;

  chatInner.appendChild(card);
  scrollToBottom();
}

// Vis skriveindikator (tre prikker) mens AI tenker
function showTyping() {
  const chatInner = document.getElementById('chat-inner');

  const row = document.createElement('div');
  row.className = 'bubble-row ai typing';
  row.id = 'typing-indicator';

  const avatar = document.createElement('div');
  avatar.className = 'ai-avatar';
  avatar.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>`;
  row.appendChild(avatar);

  const bubble = document.createElement('div');
  bubble.className = 'bubble ai';
  bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  row.appendChild(bubble);

  chatInner.appendChild(row);
  scrollToBottom();
}

function removeTyping() {
  document.getElementById('typing-indicator')?.remove();
}

function updateCounter() {
  const el = document.getElementById('question-counter');
  el.textContent = `Spørsmål ${Math.min(questionCount, 5)} / 5`;
}

// Rydd opp alle ressurser og lukk mikrofon-seksjonen etter ferdig intervju
function finishInterview() {
  isDone = true;

  // Oppdater teller til "Ferdig"-tilstand
  const counter = document.getElementById('question-counter');
  counter.textContent        = 'Ferdig';
  counter.style.background   = 'rgba(34,197,94,0.12)';
  counter.style.borderColor  = 'rgba(34,197,94,0.35)';
  counter.style.color        = '#4ADE80';

  // Stopp lydvisualisering
  stopVisualization();

  // Fjern event-lyttere for å unngå minnelekkasje
  const btn       = document.getElementById('mic-btn');
  const avbrytBtn = document.getElementById('avbryt-btn');
  const hintBtn   = document.getElementById('hint-btn');
  if (btn       && _micBtnHandler) btn.removeEventListener('click', _micBtnHandler);
  if (avbrytBtn && _avbrytHandler) avbrytBtn.removeEventListener('click', _avbrytHandler);
  if (hintBtn   && _hintHandler)   hintBtn.removeEventListener('click', _hintHandler);
  _micBtnHandler = null;
  _avbrytHandler = null;
  _hintHandler   = null;

  // Fjern mic-seksjonen fra DOM
  const micSection = document.getElementById('mic-section');
  if (micSection) {
    micSection.innerHTML     = '';
    micSection.style.padding = '0';
    micSection.style.border  = 'none';
  }

  // Stopp eventuell TTS-avspilling og rydd opp blob-URLer
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (pendingAudioUrl) { URL.revokeObjectURL(pendingAudioUrl); pendingAudioUrl = null; }
  hideListenBtn();

  // Stopp mikrofon-tracks og lukk AudioContext (bølgeform-visualiserer)
  if (micStream) micStream.getTracks().forEach(t => t.stop());
  if (audioCtx)  audioCtx.close();
}

function scrollToBottom() {
  const area = document.getElementById('chat-area');
  requestAnimationFrame(() => { area.scrollTop = area.scrollHeight; });
}
