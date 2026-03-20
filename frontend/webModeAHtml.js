export const WEB_MODE_A_HTML = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ISL Bridge - Live Detection</title>
<style>
  :root {
    --bg: #07070f;
    --surface: #0f0f1e;
    --surface-alt: #080818;
    --border: #1a1a3a;
    --text: #f5f7ff;
    --muted: #7b7fa8;
    --accent: #00f5d4;
    --accent-bg: rgba(0, 245, 212, 0.14);
    --danger: #f72585;
    --warning: #ffd166;
  }

  body.light {
    --bg: #f3f6fb;
    --surface: #ffffff;
    --surface-alt: #eef3fb;
    --border: #d7e0ef;
    --text: #111827;
    --muted: #5f6b85;
    --accent: #0a8f7d;
    --accent-bg: rgba(10, 143, 125, 0.12);
    --danger: #cc3366;
    --warning: #c98b00;
  }

  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: Arial, sans-serif;
    transition: background 0.2s ease, color 0.2s ease;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-mark {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: var(--accent-bg);
    border: 1px solid var(--border);
    display: grid;
    place-items: center;
    color: var(--accent);
    font-weight: 700;
  }

  .logo-copy strong {
    display: block;
    font-size: 15px;
  }

  .logo-copy span {
    display: block;
    font-size: 11px;
    color: var(--muted);
    margin-top: 2px;
  }

  .topbar-btns {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  button {
    font: inherit;
    cursor: pointer;
  }

  .btn-small,
  .btn-clear,
  .mode-tab {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
  }

  .btn-small {
    border-radius: 10px;
    padding: 9px 12px;
    font-size: 12px;
    font-weight: 700;
  }

  .btn-small.accent {
    border-color: var(--accent);
    color: var(--accent);
  }

  .main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 16px;
    padding: 16px;
    max-width: 1160px;
    margin: 0 auto;
  }

  .camera-section,
  .panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .camera-wrap,
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
  }

  .camera-wrap {
    position: relative;
    overflow: hidden;
    min-height: 420px;
  }

  #video,
  #canvas {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
  }

  #canvas {
    position: absolute;
    inset: 0;
  }

  .camera-overlay-text {
    position: absolute;
    top: 14px;
    left: 14px;
    display: inline-flex;
    width: fit-content;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.4);
    color: var(--accent);
    font-size: 12px;
    font-weight: 700;
  }

  .camera-state {
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: 14px;
    padding: 14px;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.55));
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }

  .sign-big {
    font-size: 46px;
    font-weight: 800;
    line-height: 1;
  }

  .conf-badge {
    padding: 6px 10px;
    border-radius: 10px;
    border: 1px solid var(--accent);
    color: var(--accent);
    background: rgba(0, 0, 0, 0.35);
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }

  .controls {
    display: flex;
    gap: 10px;
  }

  .btn-primary {
    flex: 1;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #051110;
    border-radius: 12px;
    padding: 14px 16px;
    font-size: 14px;
    font-weight: 800;
  }

  .btn-primary.active {
    background: var(--surface);
    color: var(--accent);
  }

  .btn-clear {
    border-radius: 12px;
    padding: 14px 18px;
    font-size: 13px;
    font-weight: 700;
  }

  .card {
    padding: 16px;
  }

  .card-label {
    font-size: 10px;
    letter-spacing: 0.2em;
    color: var(--muted);
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .status-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .status-row:last-child { margin-bottom: 0; }

  .status-dot {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: var(--warning);
  }

  .status-text {
    font-size: 12px;
    color: var(--muted);
  }

  .lang-toggle {
    display: flex;
    gap: 8px;
  }

  .lang-btn {
    flex: 1;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface-alt);
    color: var(--muted);
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 700;
  }

  .lang-btn.active {
    border-color: var(--accent);
    background: var(--accent-bg);
    color: var(--accent);
  }

  .output-sign {
    font-size: 48px;
    font-weight: 800;
    line-height: 1.05;
  }

  .output-sub {
    margin-top: 6px;
    color: var(--muted);
    font-size: 14px;
  }

  .output-placeholder,
  .history-empty {
    color: var(--muted);
    font-style: italic;
    font-size: 13px;
  }

  .output-meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 14px;
  }

  .meta-badge {
    border-radius: 999px;
    border: 1px solid var(--border);
    padding: 6px 10px;
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
  }

  .meta-badge.accent {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-bg);
  }

  .btn-speak {
    width: 100%;
    margin-top: 14px;
    border-radius: 12px;
    border: 1px solid var(--accent);
    background: var(--accent-bg);
    color: var(--accent);
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 800;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    background: var(--surface-alt);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 10px 12px;
  }

  .history-main {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .history-sign {
    font-size: 14px;
    font-weight: 700;
  }

  .history-time,
  .history-conf {
    color: var(--muted);
    font-size: 11px;
  }

  .mode-tab {
    width: 100%;
    border-radius: 12px;
    padding: 14px;
    font-size: 13px;
    font-weight: 700;
  }

  .notice {
    margin-top: 10px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--surface-alt);
    color: var(--muted);
    padding: 12px;
    font-size: 12px;
    line-height: 1.5;
  }

  @media (max-width: 880px) {
    .main {
      grid-template-columns: 1fr;
    }

    .camera-wrap {
      min-height: 320px;
    }
  }
</style>
</head>
<body class="dark">
<div class="topbar">
  <div class="logo">
    <div class="logo-mark">AI</div>
    <div class="logo-copy">
      <strong>ISL Bridge</strong>
      <span>Live sign recognition</span>
    </div>
  </div>
  <div class="topbar-btns">
    <button class="btn-small" onclick="toggleTheme()" id="themeBtn">Light Theme</button>
    <button class="btn-small accent" onclick="toggleMode()">Switch to Speech Mode</button>
  </div>
</div>

<div class="main">
  <div class="camera-section">
    <div class="camera-wrap">
      <video id="video" autoplay playsinline></video>
      <canvas id="canvas"></canvas>
      <div class="camera-overlay-text" id="cameraStatus">Camera loading...</div>
      <div class="camera-state" id="cameraState" style="display:none">
        <div class="sign-big" id="overlaySign">A</div>
        <div class="conf-badge" id="overlayConf">95%</div>
      </div>
    </div>

    <div class="controls">
      <button class="btn-primary" id="startBtn" onclick="toggleDetection()">Start Signing</button>
      <button class="btn-clear" onclick="clearAll()">Clear</button>
    </div>
  </div>

  <div class="panel">
    <div class="card">
      <div class="card-label">System Status</div>
      <div class="status-row">
        <div class="status-dot" id="camDot"></div>
        <div class="status-text" id="camStatus">Camera: Waiting</div>
      </div>
      <div class="status-row">
        <div class="status-dot" id="mpDot"></div>
        <div class="status-text" id="mpStatus">MediaPipe: Waiting</div>
      </div>
      <div class="status-row">
        <div class="status-dot" id="aiDot"></div>
        <div class="status-text" id="aiStatus">AI Model: Connecting</div>
      </div>
      <div class="notice" id="backendNotice" style="display:none"></div>
    </div>

    <div class="card">
      <div class="card-label">Language</div>
      <div class="lang-toggle">
        <button class="lang-btn active" id="btnEN" onclick="setLang('en')">English</button>
        <button class="lang-btn" id="btnHI" onclick="setLang('hi')">Hindi</button>
      </div>
    </div>

    <div class="card" id="outputCard">
      <div class="card-label" id="outputLabel">Detected Sign</div>
      <div id="outputArea">
        <div class="output-placeholder">Live sign output will appear here after the AI model responds.</div>
      </div>
    </div>

    <div class="card">
      <div class="card-label">Recent Signs</div>
      <div class="history-list" id="historyList">
        <div class="history-empty">No signs detected yet.</div>
      </div>
    </div>

    <button class="mode-tab" onclick="toggleMode()">Open Speech to Text</button>
  </div>
</div>

<script>
const BACKEND = '__BACKEND_URL__'.trim();
const BACKEND_CANDIDATES = __BACKEND_URL_CANDIDATES__;
const MEDIA_PIPE_TIMEOUT_MS = 12000;
const MEDIA_PIPE_SOURCES = {
  hands: [
    'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
    'https://unpkg.com/@mediapipe/hands/hands.js',
  ],
  drawing: [
    'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
    'https://unpkg.com/@mediapipe/drawing_utils/drawing_utils.js',
  ],
};
const SIGN_TO_HINDI = {
  del: 'Delete',
  nothing: 'Nothing',
  space: 'Space',
};

const COPY = {
  en: {
    outputLabel: 'Detected Sign',
    start: 'Start Signing',
    stop: 'Stop Signing',
    placeholder: 'Live sign output will appear here after the AI model responds.',
    confidence: 'Confidence',
    speak: 'Speak Again',
    historyEmpty: 'No signs detected yet.',
    cameraReady: 'Camera active - show your hand',
    cameraMissing: 'Show your hand clearly',
    cameraIdle: 'Position your hand in the frame',
    cameraRequest: 'Allow camera access to start live detection.',
    backendMissing: 'Backend URL missing. Set EXPO_PUBLIC_BACKEND_URL in Vercel or use the production fallback.',
    backendOffline: 'Backend unavailable. Render may be sleeping or the URL may be incorrect.',
    backendLoading: 'Backend reached. Render is waking up the AI model. Please wait a moment.',
    backendReady: (count) => 'AI Model: Ready (' + count + ' signs)',
    backendNotLoaded: 'AI Model: Connected, but model is not loaded',
    mediapipeLoading: 'MediaPipe: Loading libraries',
    mediapipeError: 'MediaPipe libraries could not be loaded',
  },
  hi: {
    outputLabel: 'Pehchana Gaya Sign',
    start: 'Sign Shuru Karein',
    stop: 'Sign Rokein',
    placeholder: 'AI response aane ke baad sign yahan dikhai dega.',
    confidence: 'Confidence',
    speak: 'Dobara Bolen',
    historyEmpty: 'Abhi koi sign detect nahi hua.',
    cameraReady: 'Camera active - haath dikhaiye',
    cameraMissing: 'Haath saaf dikhaiye',
    cameraIdle: 'Haath ko frame mein rakhiye',
    cameraRequest: 'Live detection shuru karne ke liye camera allow karein.',
    backendMissing: 'Backend URL missing hai. Vercel mein EXPO_PUBLIC_BACKEND_URL set karein.',
    backendOffline: 'Backend unavailable hai. Render sleep mode mein ho sakta hai ya URL galat ho sakta hai.',
    backendLoading: 'Backend mil gaya hai. Render AI model ko warm up kar raha hai. Thoda wait karein.',
    backendReady: (count) => 'AI Model: Ready (' + count + ' signs)',
    backendNotLoaded: 'AI Model connected hai, lekin model load nahi hua',
    mediapipeLoading: 'MediaPipe: Libraries load ho rahi hain',
    mediapipeError: 'MediaPipe libraries load nahi ho paayin',
  },
};

let detecting = false;
let currentLang = 'en';
let isDark = true;
let lastSend = 0;
let history = [];
let hands = null;
let activeBackend = BACKEND;
let activeHandsBase = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/';
let frameLoopActive = false;
let processingFrame = false;

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function text(key, arg) {
  const value = COPY[currentLang][key];
  return typeof value === 'function' ? value(arg) : value;
}

function setNotice(message) {
  const notice = document.getElementById('backendNotice');
  notice.style.display = message ? 'block' : 'none';
  notice.textContent = message || '';
}

function setStatus(id, state, message) {
  const dot = document.getElementById(id + 'Dot');
  const label = document.getElementById(id + 'Status');
  const colors = {
    ok: 'var(--accent)',
    warn: 'var(--warning)',
    error: 'var(--danger)',
  };
  dot.style.background = colors[state] || colors.warn;
  label.textContent = message;
}

function getBackendCandidates() {
  const seen = new Set();
  const ordered = [];

  [activeBackend].concat(BACKEND_CANDIDATES || []).forEach(function(candidate) {
    const normalized = String(candidate || '').trim().replace(/\/+$/, '');
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    ordered.push(normalized);
  });

  return ordered;
}

function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(function() {
    controller.abort();
  }, timeoutMs);

  return fetch(url, Object.assign({}, options, { signal: controller.signal })).finally(function() {
    clearTimeout(timeout);
  });
}

async function requestBackend(path, options, timeoutMs) {
  const candidates = getBackendCandidates();
  if (candidates.length === 0) {
    throw new Error('Backend URL missing');
  }

  let lastError = null;
  for (const candidate of candidates) {
    try {
      const response = await fetchWithTimeout(candidate + path, options, timeoutMs);
      activeBackend = candidate;
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Backend unavailable');
}

function loadScriptWithFallback(urls, label) {
  return new Promise(function(resolve, reject) {
    let index = 0;

    function attempt() {
      if (index >= urls.length) {
        reject(new Error(label + ' failed to load from all configured CDNs.'));
        return;
      }

      const scriptUrl = urls[index++];
      const script = document.createElement('script');
      let settled = false;
      const timeout = setTimeout(function() {
        if (settled) {
          return;
        }

        settled = true;
        script.remove();
        attempt();
      }, MEDIA_PIPE_TIMEOUT_MS);

      script.src = scriptUrl;
      script.async = true;
      script.onload = function() {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);
        resolve(scriptUrl);
      };
      script.onerror = function() {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);
        script.remove();
        attempt();
      };

      document.head.appendChild(script);
    }

    attempt();
  });
}

async function loadMediaPipeLibraries() {
  if (window.Hands && window.drawConnectors && window.drawLandmarks) {
    return;
  }

  setStatus('mp', 'warn', text('mediapipeLoading'));
  const handsScript = await loadScriptWithFallback(MEDIA_PIPE_SOURCES.hands, 'MediaPipe Hands');
  activeHandsBase = handsScript.replace(/hands\.js(?:\?.*)?$/, '');
  await loadScriptWithFallback(MEDIA_PIPE_SOURCES.drawing, 'MediaPipe Drawing');
}

function startFrameLoop() {
  if (frameLoopActive) {
    return;
  }

  frameLoopActive = true;

  async function tick() {
    if (!frameLoopActive) {
      return;
    }

    if (hands && video.readyState >= 2 && !processingFrame) {
      processingFrame = true;
      try {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        await hands.send({ image: video });
      } catch (error) {
        console.error('MediaPipe frame error:', error);
      } finally {
        processingFrame = false;
      }
    }

    window.requestAnimationFrame(tick);
  }

  window.requestAnimationFrame(tick);
}

async function initMediaPipe() {
  try {
    document.getElementById('cameraStatus').textContent = text('cameraRequest');
    setStatus('cam', 'warn', 'Camera: Requesting access');
    await loadMediaPipeLibraries();

    hands = new Hands({
      locateFile: function(file) {
        return activeHandsBase + file;
      },
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera access is not available in this browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 },
    });
    video.srcObject = stream;

    await new Promise(function(resolve) {
      if (video.readyState >= 2) {
        resolve();
        return;
      }

      video.onloadedmetadata = function() {
        resolve();
      };
    });
    await video.play();
    startFrameLoop();
    setStatus('cam', 'ok', 'Camera: Active');
    setStatus('mp', 'ok', 'MediaPipe: Ready');
    document.getElementById('cameraStatus').textContent = text('cameraReady');
  } catch (error) {
    setStatus('mp', 'error', text('mediapipeError'));
    setStatus('cam', 'error', 'Camera: ' + error.message);
    document.getElementById('cameraStatus').textContent = 'Camera error: ' + error.message;
    console.error('Mode A startup error:', error);
  }
}

function onResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#00f5d488', lineWidth: 2 });
    drawLandmarks(ctx, landmarks, { color: '#00f5d4', lineWidth: 1, radius: 3 });

    if (detecting) {
      const now = Date.now();
      if (now - lastSend > 800) {
        lastSend = now;
        const coords = landmarks.flatMap(function(point) {
          return [point.x, point.y, point.z];
        });
        sendToBackend(coords);
      }
    }

    document.getElementById('cameraStatus').textContent = text('cameraReady');
  } else {
    document.getElementById('cameraStatus').textContent = detecting ? text('cameraMissing') : text('cameraIdle');
  }
}

async function sendToBackend(landmarks) {
  if (getBackendCandidates().length === 0) {
    setNotice(text('backendMissing'));
    setStatus('ai', 'error', 'AI Model: URL missing');
    return;
  }

  try {
    const response = await requestBackend('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ landmarks: landmarks }),
    }, 8000);

    if (!response.ok) {
      if (response.status === 503) {
        setNotice(text('backendLoading'));
        setStatus('ai', 'warn', 'AI Model: Loading on Render');
        return;
      }

      throw new Error('Prediction failed with status ' + response.status);
    }

    const data = await response.json();
    if (!data.sign) {
      throw new Error(data.error || 'Prediction response is missing a sign.');
    }

    showResult(data);
  } catch (error) {
    setNotice(text('backendOffline'));
    setStatus('ai', 'error', 'AI Model: Backend unavailable');
    console.error('Backend error:', error);
  }
}

function showResult(data) {
  const sign = data.sign;
  const confidence = data.confidence;
  const hindi = SIGN_TO_HINDI[sign] || sign;
  const display = currentLang === 'hi' ? hindi : sign;

  document.getElementById('outputArea').innerHTML = [
    '<div class="output-sign">' + display + '</div>',
    currentLang === 'hi' ? '<div class="output-sub">' + sign + '</div>' : '',
    '<div class="output-meta">',
    '<span class="meta-badge accent">' + text('confidence') + ': ' + confidence + '%</span>',
    '<span class="meta-badge">' + (data.mode === 'model' ? 'AI Model' : 'Mock Response') + '</span>',
    '</div>',
    '<button class="btn-speak" onclick="speak(\\'' + String(display).replace(/'/g, "\\\\'") + '\\')">' + text('speak') + '</button>',
  ].join('');

  document.getElementById('cameraState').style.display = 'flex';
  document.getElementById('overlaySign').textContent = display;
  document.getElementById('overlayConf').textContent = confidence + '%';
  document.getElementById('outputCard').style.borderColor = 'var(--accent)';

  if (confidence > 75) {
    speak(display);
  }

  addToHistory(sign, confidence, hindi);
}

function addToHistory(sign, confidence, hindi) {
  history.unshift({
    display: currentLang === 'hi' ? hindi : sign,
    confidence: confidence,
    time: new Date().toLocaleTimeString(),
  });
  if (history.length > 10) {
    history.pop();
  }

  const list = document.getElementById('historyList');
  if (history.length === 0) {
    list.innerHTML = '<div class="history-empty">' + text('historyEmpty') + '</div>';
    return;
  }

  list.innerHTML = history.map(function(entry) {
    return [
      '<div class="history-item">',
      '<div class="history-main">',
      '<span class="history-sign">' + entry.display + '</span>',
      '<span class="history-time">' + entry.time + '</span>',
      '</div>',
      '<span class="history-conf">' + entry.confidence + '%</span>',
      '</div>',
    ].join('');
  }).join('');
}

function speak(textToSpeak) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.lang = currentLang === 'hi' ? 'hi-IN' : 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function toggleDetection() {
  detecting = !detecting;
  const startBtn = document.getElementById('startBtn');
  startBtn.textContent = detecting ? text('stop') : text('start');
  startBtn.classList.toggle('active', detecting);
}

function clearAll() {
  detecting = false;
  history = [];
  document.getElementById('startBtn').textContent = text('start');
  document.getElementById('startBtn').classList.remove('active');
  document.getElementById('cameraState').style.display = 'none';
  document.getElementById('outputCard').style.borderColor = 'var(--border)';
  document.getElementById('outputArea').innerHTML = '<div class="output-placeholder">' + text('placeholder') + '</div>';
  document.getElementById('historyList').innerHTML = '<div class="history-empty">' + text('historyEmpty') + '</div>';
}

function setLang(lang) {
  currentLang = lang;
  document.getElementById('btnEN').classList.toggle('active', lang === 'en');
  document.getElementById('btnHI').classList.toggle('active', lang === 'hi');
  document.getElementById('outputLabel').textContent = text('outputLabel');
  document.getElementById('startBtn').textContent = detecting ? text('stop') : text('start');
  if (history.length === 0) {
    document.getElementById('historyList').innerHTML = '<div class="history-empty">' + text('historyEmpty') + '</div>';
  }
}

function toggleMode() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'isl-bridge-switch-mode', mode: 'ModeB' }, '*');
    return;
  }
  alert('Use the Speech to Text tab above.');
}

function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('light', !isDark);
  document.body.classList.toggle('dark', isDark);
  document.getElementById('themeBtn').textContent = isDark ? 'Light Theme' : 'Dark Theme';
}

async function checkBackend() {
  if (getBackendCandidates().length === 0) {
    setNotice(text('backendMissing'));
    setStatus('ai', 'error', 'AI Model: URL missing');
    return;
  }

  try {
    const response = await requestBackend('/health', {}, 10000);
    if (!response.ok) {
      throw new Error('Health check failed with status ' + response.status);
    }

    const data = await response.json();
    if (data.model === 'loaded') {
      setNotice('');
      setStatus('ai', 'ok', text('backendReady', data.signs_count));
      return;
    }

    if (data.model === 'loading') {
      setNotice(text('backendLoading'));
      setStatus('ai', 'warn', 'AI Model: Loading on Render');
      return;
    }

    setNotice(data.error || text('backendNotLoaded'));
    setStatus('ai', 'warn', text('backendNotLoaded'));
  } catch (error) {
    setNotice(text('backendOffline'));
    setStatus('ai', 'error', 'AI Model: Backend unavailable');
    console.error('Health check error:', error);
  }
}

clearAll();
checkBackend();
initMediaPipe();
setInterval(checkBackend, 15000);
</script>
</body>
</html>`;
