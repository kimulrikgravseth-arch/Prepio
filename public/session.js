/* ── Tilstand ──────────────────────────────────────────────────────────────── */
let interviewData  = null;
let history        = [];
let questionCount  = 0;
let isDone         = false;

// Stemmetilstand: 'idle' | 'ai_speaking' | 'ready' | 'recording' | 'processing'
let voiceState       = 'idle';
let mediaRecorder    = null;
let audioChunks      = [];
let recordStart      = 0;
let micStream        = null;

// Lydavspilling (Web Audio API — låses opp én gang via start-knapp)
let audioCtx         = null;
let currentAudioSrc  = null;   // aktiv BufferSource — kan stoppes

// Visualiserer
let analyser         = null;
let analyserSrc      = null;
let animFrameId      = null;

// Hint
let hintUsed         = false;

// Event-lyttere lagret slik at de kan fjernes i finishInterview()
let _micBtnHandler   = null;
let _avbrytHandler   = null;
let _hintHandler     = null;

/* ── Arena-modus ─────────────────────────────────────────────────────────────
   Dersom URL inneholder ?mode=arena brukes /api/arena/* i stedet for
   /api/interview/*. All lyd, mikrofon og chat-logikk er identisk.
   ─────────────────────────────────────────────────────────────────────────── */
const _urlParams    = new URLSearchParams(window.location.search);
const IS_ARENA      = _urlParams.get('mode') === 'arena';
const arenaData     = IS_ARENA ? {
  type:       _urlParams.get('type')       || 'salg',
  topic:      _urlParams.get('topic')      || '',
  opponent:   _urlParams.get('opponent')   || '',
  difficulty: _urlParams.get('difficulty') || 'Middels',
} : null;

/* ── Hjelper ──────────────────────────────────────────────────────────────── */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/* ── TTS-lydtest (debug) ──────────────────────────────────────────────────── */
async function testTTS() {
  const btn    = document.getElementById('tts-test-btn');
  const status = document.getElementById('tts-test-status');
  if (!btn || !status) return;

  btn.disabled = true;
  status.className = 'tts-test-status';

  // Sørg for at AudioContext er låst opp (krever at beginSession() er kjørt)
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    console.log('[TEST-TTS] Gjenopptar AudioContext...');
    await audioCtx.resume();
  }
  console.log('[TEST-TTS] AudioContext state:', audioCtx.state);

  status.textContent = 'Henter lyd fra ElevenLabs...';
  console.log('[TEST-TTS] → Kaller /api/tts...');

  try {
    const t0  = Date.now();
    const res = await fetch('/api/tts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text: 'Hei, dette er en test av lydsystemet.' }),
    });

    const elapsed     = Date.now() - t0;
    const contentType = res.headers.get('content-type') || '(ingen)';
    console.log(`[TEST-TTS] ← Svar: HTTP ${res.status} | Content-Type: ${contentType} | ${elapsed}ms`);

    if (!res.ok) {
      const errText = await res.text();
      console.error('[TEST-TTS] ✗ Feil fra server:', errText);
      status.textContent = `Feil fra server: HTTP ${res.status} — ${errText}`;
      status.className   = 'tts-test-status err';
      btn.disabled = false;
      return;
    }

    const arrayBuffer = await res.arrayBuffer();
    console.log(`[TEST-TTS] ✓ Mottatt ${arrayBuffer.byteLength} bytes, Content-Type: ${contentType}`);

    status.textContent = `Lyd mottatt (${arrayBuffer.byteLength} bytes), spiller av...`;

    try {
      const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      console.log('[TEST-TTS] ✓ Dekodert, varighet:', decoded.duration.toFixed(2) + 's');

      await new Promise((resolve) => {
        const source = audioCtx.createBufferSource();
        source.buffer = decoded;
        source.connect(audioCtx.destination);
        source.onended = resolve;
        source.start(0);
      });

      console.log('[TEST-TTS] ✓ Avspilling ferdig!');
      status.textContent = 'Lyd ferdig! ✓';
      status.className   = 'tts-test-status ok';
    } catch (decodeErr) {
      console.error('[TEST-TTS] ✗ Dekoding/avspilling feilet:', decodeErr.name, decodeErr.message);
      status.textContent = `Dekoding feilet: ${decodeErr.name} — ${decodeErr.message}`;
      status.className   = 'tts-test-status err';
    }

  } catch (fetchErr) {
    console.error('[TEST-TTS] ✗ Fetch feilet:', fetchErr.name, fetchErr.message);
    status.textContent = `Nettverksfeil: ${fetchErr.message}`;
    status.className   = 'tts-test-status err';
  }

  btn.disabled = false;
}

/* ── Init ─────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const raw = sessionStorage.getItem('prepioInterview');
  if (!raw) { window.location.href = '/interview'; return; }

  try {
    interviewData = JSON.parse(raw);
  } catch {
    window.location.href = '/interview';
    return;
  }

  if (IS_ARENA) {
    const typeLabels = { salg: 'Salgsøving', pitching: 'Pitching', forhandling: 'Forhandling', kunde: 'Kundesamtale' };
    document.getElementById('session-title').textContent =
      `${typeLabels[arenaData.type] || 'Øving'}: ${arenaData.topic}`;
  } else {
    document.getElementById('session-title').textContent = interviewData.company
      ? `${interviewData.jobTitle} hos ${interviewData.company}`
      : interviewData.jobTitle;
  }

  // Koble lydtest-knappen (fungerer også FØR start-overlay-klikk)
  const testBtn = document.getElementById('tts-test-btn');
  if (testBtn) testBtn.addEventListener('click', testTTS);

  // Vis start-overlay — bruker må trykke én gang for å låse opp lyd (Safari/iOS)
  const overlay = document.getElementById('start-overlay');
  if (overlay) overlay.removeAttribute('hidden');

  const startBtn = document.getElementById('start-session-btn');
  if (startBtn) startBtn.addEventListener('click', beginSession);
});

/* ── Start-sesjonen (én brukerhandling låser opp lyd for hele sesjonen) ──── */
async function beginSession() {
  const overlay = document.getElementById('start-overlay');
  if (overlay) overlay.setAttribute('hidden', '');

  // Opprett og start AudioContext i dette brukertrykket — Safari godtar det
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  console.log('[Audio] AudioContext låst opp:', audioCtx.state);

  await requestMic();
  if (IS_ARENA) startArena();
  else          startInterview();
}

/* ── AudioContext-oppretting ved mikrofon-trykk ──────────────────────────── */
function unlockAudio() {
  if (!audioCtx) return;
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
    case 'ai_speaking':
      btn.className += ' mic-ai-speaking';
      btn.disabled   = true;
      setStatus('Intervjueren snakker...');
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

  // Avbryt-knapp: synlig kun når AI snakker
  if (avbrytBtn) {
    if (voiceState === 'ai_speaking') {
      avbrytBtn.removeAttribute('hidden');
    } else {
      avbrytBtn.setAttribute('hidden', '');
    }
  }

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

  _micBtnHandler = () => {
    unlockAudio();
    if (voiceState === 'ready')          startRecording();
    else if (voiceState === 'recording') stopRecording();
  };

  _avbrytHandler = () => {
    if (currentAudioSrc) {
      try { currentAudioSrc.stop(); } catch {}
      currentAudioSrc = null;
    }
    // playTTS() løser opp via onended og kaller setVoiceState('ready')
  };

  _hintHandler = fetchHint;

  btn.addEventListener('click', _micBtnHandler);
  avbrytBtn.addEventListener('click', _avbrytHandler);
  hintBtn.addEventListener('click', _hintHandler);
}

/* ── Hint ─────────────────────────────────────────────────────────────────── */
async function fetchHint() {
  hintUsed = true;
  updateMicUI();

  const hintBox  = document.getElementById('hint-box');
  const hintText = document.getElementById('hint-text');

  hintBox.removeAttribute('hidden');
  hintText.textContent = 'Henter hint...';

  setVoiceState('idle');

  try {
    const res  = await fetch('/api/interview/hint', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...interviewData, messages: history }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Klarte ikke hente hint');

    hintText.textContent = data.hint;
    await playTTS(data.hint);
  } catch (err) {
    console.error('[Hint] Feil:', err);
    const online = navigator.onLine;
    hintText.textContent = online
      ? 'Klarte ikke hente hint. Prøv igjen.'
      : 'Ingen internettforbindelse. Sjekk tilkoblingen din.';
    hintUsed = false;
    setVoiceState('ready');
  }
}

function resetHint() {
  hintUsed = false;
  const hintBox = document.getElementById('hint-box');
  if (hintBox) hintBox.setAttribute('hidden', '');
  const hintText = document.getElementById('hint-text');
  if (hintText) hintText.textContent = '';
}

/* ── Opptak ───────────────────────────────────────────────────────────────── */
function startRecording() {
  if (!micStream) return;

  audioChunks = [];
  recordStart = Date.now();

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

/* ── Tekst-til-tale (Web Audio API — fungerer fordi AudioContext er låst opp) */
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

async function playTTS(text) {
  const cleanText = stripMarkdown(text);
  if (!cleanText) return;

  setVoiceState('ai_speaking');
  await delay(500);

  console.log('[TTS] → Ber om lyd, tekstlengde:', cleanText.length);

  try {
    const t0  = Date.now();
    const res = await fetch('/api/tts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text: cleanText }),
    });

    const elapsed     = Date.now() - t0;
    const contentType = res.headers.get('content-type') || '(ingen)';
    console.log(`[TTS] ← Svar: HTTP ${res.status} | Content-Type: ${contentType} | ${elapsed}ms`);

    if (!res.ok) {
      const errText = await res.text();
      console.error('[TTS] ✗ Feil fra server:', errText);
      if (!isDone) setVoiceState('ready');
      return;
    }

    const arrayBuffer = await res.arrayBuffer();
    console.log(`[TTS] ✓ Mottatt ${arrayBuffer.byteLength} bytes`);

    console.log('[TTS] AudioContext state:', audioCtx?.state);
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    console.log('[TTS] ✓ Dekodert, varighet:', decoded.duration.toFixed(2) + 's — starter avspilling');

    await new Promise((resolve) => {
      const source = audioCtx.createBufferSource();
      source.buffer = decoded;
      source.connect(audioCtx.destination);
      currentAudioSrc = source;

      source.onended = () => {
        currentAudioSrc = null;
        console.log('[TTS] ✓ Avspilling ferdig');
        resolve();
      };
      source.start(0);
    });

  } catch (err) {
    console.error('[TTS] ✗ Feil:', err.name, err.message);
  }

  if (!isDone) setVoiceState('ready');
}

/* ── API-kall ─────────────────────────────────────────────────────────────── */
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
    await playTTS(data.message);
  } catch (err) {
    removeTyping();
    const online = navigator.onLine;
    appendBubble('ai', online
      ? `Feil: ${err.message}`
      : 'Ingen internettforbindelse. Sjekk tilkoblingen din og last siden på nytt.');
    setVoiceState('ready');
  }
}

/* ── Arena-modus: start økt ───────────────────────────────────────────────── */
async function startArena() {
  setVoiceState('idle');
  showTyping();

  try {
    const res  = await fetch('/api/arena/start', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(arenaData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ukjent feil');

    history.push({ role: 'user',      content: 'Hei, jeg er klar. La oss begynne.' });
    history.push({ role: 'assistant', content: data.message });

    removeTyping();
    appendBubble('ai', data.message);
    questionCount = 1;
    updateCounter();

    setupMicButton();
    await playTTS(data.message);
  } catch (err) {
    removeTyping();
    appendBubble('ai', `Feil: ${err.message}`);
    setVoiceState('ready');
  }
}

async function sendMessage(userText) {
  history.push({ role: 'user', content: userText });
  appendBubble('user', userText);
  setVoiceState('idle');

  await delay(1500);

  showTyping();
  const isFinalQuestion = questionCount >= 5;

  try {
    if (IS_ARENA) {
      // ── Arena-modus ──────────────────────────────────────────────────────
      const res  = await fetch('/api/arena/message', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...arenaData, messages: history, messageCount: questionCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ukjent feil');

      history.push({ role: 'assistant', content: data.message });
      removeTyping();
      appendBubble('ai', data.message);

      await playTTS(data.message);

      if (data.isComplete) {
        finishInterview();
      } else {
        questionCount++;
        updateCounter();
        resetHint();
      }

    } else if (isFinalQuestion) {
      // ── Intervju-modus, siste spørsmål ───────────────────────────────────
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

      await playTTS(msgData.message);

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
      // ── Intervju-modus, neste spørsmål ───────────────────────────────────
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
      resetHint();

      await playTTS(data.message);
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
  bubble.innerHTML = role === 'ai' ? marked.parse(text) : '';
  if (role !== 'ai') bubble.textContent = text;
  row.appendChild(bubble);

  chatInner.appendChild(row);
  scrollToBottom();
}

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

function finishInterview() {
  isDone = true;

  const counter = document.getElementById('question-counter');
  counter.textContent        = 'Ferdig';
  counter.style.background   = 'rgba(34,197,94,0.12)';
  counter.style.borderColor  = 'rgba(34,197,94,0.35)';
  counter.style.color        = '#4ADE80';

  stopVisualization();

  const btn       = document.getElementById('mic-btn');
  const avbrytBtn = document.getElementById('avbryt-btn');
  const hintBtn   = document.getElementById('hint-btn');
  if (btn       && _micBtnHandler) btn.removeEventListener('click', _micBtnHandler);
  if (avbrytBtn && _avbrytHandler) avbrytBtn.removeEventListener('click', _avbrytHandler);
  if (hintBtn   && _hintHandler)   hintBtn.removeEventListener('click', _hintHandler);
  _micBtnHandler = null;
  _avbrytHandler = null;
  _hintHandler   = null;

  const micSection = document.getElementById('mic-section');
  if (micSection) {
    micSection.innerHTML     = '';
    micSection.style.padding = '0';
    micSection.style.border  = 'none';
  }

  if (micStream) micStream.getTracks().forEach(t => t.stop());
  if (audioCtx)  audioCtx.close();
}

function scrollToBottom() {
  const area = document.getElementById('chat-area');
  requestAnimationFrame(() => { area.scrollTop = area.scrollHeight; });
}
