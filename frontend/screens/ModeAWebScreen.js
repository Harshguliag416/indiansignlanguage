import { useContext, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as MediaPipeDrawing from '@mediapipe/drawing_utils';
import * as MediaPipeHands from '@mediapipe/hands';
import { AppContext } from '../AppContext';
import { BACKEND_URL, HAS_BACKEND_URL } from '../config';
import { WEB_DISPLAY_FONT, WEB_FONT_FAMILY } from '../design';

const DEMO_PRESETS = [
  { id: 'A', label: 'A', sequence: ['A'], word: 'A' },
  { id: 'B', label: 'B', sequence: ['B'], word: 'B' },
  { id: 'H', label: 'H', sequence: ['H'], word: 'H' },
  { id: 'W', label: 'W', sequence: ['W'], word: 'W' },
  { id: 'Y', label: 'Y', sequence: ['Y'], word: 'Y' },
  { id: 'HI', label: 'HI', sequence: ['H', 'I'], word: 'HI' },
  { id: 'HELLO', label: 'HELLO', sequence: ['H', 'E', 'L', 'L', 'O'], word: 'HELLO' },
  { id: 'YES', label: 'YES', sequence: ['Y', 'E', 'S'], word: 'YES' },
  { id: 'NO', label: 'NO', sequence: ['N', 'O'], word: 'NO' },
  { id: 'HELP', label: 'HELP', sequence: ['H', 'E', 'L', 'P'], word: 'HELP' },
  { id: 'WATER', label: 'WATER', sequence: ['W', 'A', 'T', 'E', 'R'], word: 'WATER' },
];

const SIGN_TO_HINDI = {
  A: 'A',
  B: 'B',
  H: 'H',
  W: 'W',
  Y: 'Y',
  HI: 'HI',
  HELLO: 'HELLO',
  YES: 'YES',
  NO: 'NO',
  HELP: 'HELP',
  WATER: 'WATER',
};

const MEDIAPIPE_HANDS_BASES = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240',
  'https://unpkg.com/@mediapipe/hands@0.4.1675469240',
];

const TEXT = {
  en: {
    title: 'Mute -> Hearing',
    subtitle: 'Camera plus MediaPipe hand tracking for live landmark prediction.',
    startCamera: 'Start Camera',
    stopCamera: 'Stop Camera',
    startSigning: 'Start Signing',
    stopSigning: 'Stop Signing',
    clear: 'Clear',
    backendMissing: 'Backend URL missing.',
    backendOffline: 'Backend offline.',
    backendReady: 'Backend ready.',
    trackingLoading: 'Loading hand tracking libraries...',
    trackingReady: 'Hand tracking ready.',
    trackingMissing: 'Show one clear hand.',
    trackingError: 'Hand tracking failed.',
    cameraBlocked: 'Camera blocked.',
    outputLabel: 'Detected Sign',
    outputPlaceholder: 'Result will appear here.',
    confidence: 'Confidence',
    demoTitle: 'Demo Showcase',
    historyTitle: 'Recent Detections',
    historyEmpty: 'No signs detected yet.',
  },
  hi: {
    title: 'Mute -> Hearing',
    subtitle: 'Live landmark prediction ke liye camera aur MediaPipe hand tracking.',
    startCamera: 'Camera Chalu Karein',
    stopCamera: 'Camera Band Karein',
    startSigning: 'Signing Chalu Karein',
    stopSigning: 'Signing Rokein',
    clear: 'Saaf Karein',
    backendMissing: 'Backend URL missing hai.',
    backendOffline: 'Backend offline hai.',
    backendReady: 'Backend tayyar hai.',
    trackingLoading: 'Hand tracking libraries load ho rahi hain...',
    trackingReady: 'Hand tracking tayyar hai.',
    trackingMissing: 'Ek haath clearly dikhaiye.',
    trackingError: 'Hand tracking fail ho gayi.',
    cameraBlocked: 'Camera blocked hai.',
    outputLabel: 'Pehchana Gaya Sign',
    outputPlaceholder: 'Result yahan dikhai dega.',
    confidence: 'Confidence',
    demoTitle: 'Demo Showcase',
    historyTitle: 'Recent Detections',
    historyEmpty: 'Abhi koi sign detect nahin hua.',
  },
};

export default function ModeAWebScreen() {
  const { theme, lang, isDark, setIsDark, setLang } = useContext(AppContext);
  const t = TEXT[lang];

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const handsRef = useRef(null);
  const demoTimerRef = useRef(null);
  const loopActiveRef = useRef(false);
  const busyRef = useRef(false);
  const sendingRef = useRef(false);
  const lastSendRef = useRef(0);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [backendStatus, setBackendStatus] = useState(HAS_BACKEND_URL ? 'checking' : 'missing');
  const [trackingStatus, setTrackingStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [demoId, setDemoId] = useState(null);
  const [history, setHistory] = useState([]);

  const speakText = (text) => {
    if (!window.speechSynthesis || !text) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const addHistory = (sign, confidence) => {
    const display = lang === 'hi' ? (SIGN_TO_HINDI[sign] || sign) : sign;
    setHistory((current) => [{ sign: display, confidence, at: new Date().toLocaleTimeString() }, ...current].slice(0, 8));
  };

  const checkBackend = async () => {
    if (!HAS_BACKEND_URL) {
      setBackendStatus('missing');
      return 'missing';
    }

    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      const data = await response.json();
      const next = data?.status === 'healthy' ? 'ready' : 'offline';
      setBackendStatus(next);
      return next;
    } catch {
      setBackendStatus('offline');
      return 'offline';
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const stopDemo = () => {
    if (demoTimerRef.current) {
      window.clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    setDemoId(null);
  };

  const stopCamera = () => {
    loopActiveRef.current = false;
    setSigning(false);
    stopDemo();
    clearCanvas();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStarted(false);
    setTrackingStatus('idle');
    setMessage('');
  };

  const sendPrediction = async (coords) => {
    if (!signing || sendingRef.current || !HAS_BACKEND_URL) {
      return;
    }

    sendingRef.current = true;
    try {
      const response = await fetch(`${BACKEND_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landmarks: coords }),
      });

      if (!response.ok) {
        throw new Error(`Prediction failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data?.sign) {
        return;
      }

      setResult({ sign: data.sign, confidence: data.confidence, mode: data.mode || 'model' });
      setMessage(t.backendReady);
      addHistory(data.sign, data.confidence);
      if (data.confidence >= 80) {
        speakText(lang === 'hi' ? (SIGN_TO_HINDI[data.sign] || data.sign) : data.sign);
      }
    } catch {
      setBackendStatus('offline');
      setMessage(t.backendOffline);
    } finally {
      sendingRef.current = false;
    }
  };

  const onResults = (results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const landmarks = results.multiHandLandmarks?.[0];
    if (!landmarks) {
      setTrackingStatus(cameraStarted ? 'missing' : 'idle');
      if (signing) {
        setMessage(t.trackingMissing);
      }
      return;
    }

    MediaPipeDrawing.drawConnectors(ctx, landmarks, MediaPipeHands.HAND_CONNECTIONS || [], { color: '#22C7C9', lineWidth: 2 });
    MediaPipeDrawing.drawLandmarks(ctx, landmarks, { color: '#F59E0B', lineWidth: 1, radius: 3 });
    setTrackingStatus('ready');
    if (!signing) {
      setMessage(t.trackingReady);
      return;
    }

    const now = Date.now();
    if (now - lastSendRef.current >= 800) {
      lastSendRef.current = now;
      sendPrediction(landmarks.flatMap((point) => [point.x, point.y, point.z]));
    }
  };

  const startLoop = () => {
    if (loopActiveRef.current) {
      return;
    }

    loopActiveRef.current = true;
    const tick = async () => {
      if (!loopActiveRef.current) {
        return;
      }

      const video = videoRef.current;
      if (handsRef.current && video && video.readyState >= 2 && !busyRef.current) {
        busyRef.current = true;
        try {
          await handsRef.current.send({ image: video });
        } catch {
          setTrackingStatus('error');
          setMessage(t.trackingError);
        } finally {
          busyRef.current = false;
        }
      }

      window.requestAnimationFrame(tick);
    };

    window.requestAnimationFrame(tick);
  };

  const ensureHands = async () => {
    if (handsRef.current) {
      return true;
    }

    setTrackingStatus('loading');
    setMessage(t.trackingLoading);

    for (const base of MEDIAPIPE_HANDS_BASES) {
      const hands = new MediaPipeHands.Hands({
        locateFile: (file) => `${base}/${file}`,
      });

      try {
        hands.setOptions({
          selfieMode: true,
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5,
        });
        hands.onResults(onResults);
        await hands.initialize();
        handsRef.current = hands;
        setTrackingStatus('ready');
        setMessage(t.trackingReady);
        return true;
      } catch {
        await hands.close().catch(() => {});
      }
    }

    setTrackingStatus('error');
    setMessage(t.trackingError);
    return false;
  };

  const startCamera = async () => {
    stopDemo();
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage(t.cameraBlocked);
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraStarted(true);
      const ok = await ensureHands();
      if (ok) {
        startLoop();
      }
      return ok;
    } catch {
      setMessage(t.cameraBlocked);
      return false;
    }
  };

  const clearAll = () => {
    setSigning(false);
    stopDemo();
    setResult(null);
    setHistory([]);
    setMessage(cameraStarted ? t.trackingReady : '');
    window.speechSynthesis?.cancel?.();
  };

  const stopSigning = () => {
    setSigning(false);
    sendingRef.current = false;
    setMessage(cameraStarted ? t.trackingReady : '');
  };

  const startSigning = async () => {
    stopDemo();
    if (!cameraStarted) {
      const ok = await startCamera();
      if (!ok) {
        return;
      }
    }

    const ok = await ensureHands();
    if (!ok) {
      return;
    }

    const nextBackend = await checkBackend();
    setSigning(true);
    setMessage(nextBackend === 'ready' ? t.backendReady : nextBackend === 'missing' ? t.backendMissing : t.backendOffline);
    startLoop();
  };

  const runDemo = (preset) => {
    setSigning(false);
    stopDemo();
    setDemoId(preset.id);

    let index = 0;
    const step = () => {
      const sign = preset.sequence[index];
      const confidence = Math.max(92, 98 - index);
      setResult({ sign, confidence, mode: 'demo', demoWord: preset.word, step: index + 1, totalSteps: preset.sequence.length });
      addHistory(sign, confidence);

      if (index === preset.sequence.length - 1) {
        window.clearInterval(demoTimerRef.current);
        demoTimerRef.current = null;
        window.setTimeout(() => speakText(preset.word), 300);
        return;
      }

      index += 1;
    };

    step();
    demoTimerRef.current = window.setInterval(step, 1000);
  };

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    checkBackend();
    return () => {
      stopCamera();
      stopDemo();
    };
  }, []);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.topBar, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
        <View style={styles.logoRow}>
          <View style={[styles.logoMark, { backgroundColor: theme.accentABg, borderColor: theme.border }]}>
            <Text style={[styles.logoMarkText, { color: theme.accentA }]}>AI</Text>
          </View>
          <View>
            <Text style={[styles.logoName, { color: theme.text }]}>ISL Bridge</Text>
            <Text style={[styles.logoSub, { color: theme.subtext }]}>{message || t.subtitle}</Text>
          </View>
        </View>
        <View style={styles.topButtons}>
          <TouchableOpacity style={[styles.smallBtn, { borderColor: theme.border, backgroundColor: theme.bg }]} onPress={() => setIsDark((current) => !current)}>
            <Text style={[styles.smallBtnText, { color: theme.text }]}>{isDark ? 'Light' : 'Dark'} Theme</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, { borderColor: theme.accentA, backgroundColor: theme.bg }]} onPress={() => setLang((current) => (current === 'en' ? 'hi' : 'en'))}>
            <Text style={[styles.smallBtnText, { color: theme.accentA }]}>{lang === 'en' ? 'Hindi' : 'English'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainGrid}>
        <View style={styles.leftColumn}>
          <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
            <Text style={[styles.heroEyebrow, { color: theme.accentA }]}>Mode A</Text>
            <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
            <Text style={[styles.subtitle, { color: theme.subtext }]}>{t.subtitle}</Text>
          </View>

          <View style={[styles.cameraCard, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
            <div style={videoShellStyle(theme)}>
              <video ref={videoRef} playsInline muted autoPlay style={videoStyle} />
              <canvas ref={canvasRef} style={canvasStyle} />
              {!cameraStarted ? (
                <div style={videoOverlayStyle(theme)}>
                  <div style={videoOverlayCardStyle(theme)}>
                    <div style={cameraIconStyle}>CAM</div>
                    <div style={cameraOverlayTextStyle(theme)}>{message || t.startCamera}</div>
                  </div>
                </div>
              ) : null}
            </div>

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: cameraStarted ? theme.card : theme.accentA, borderColor: theme.accentA }]} onPress={cameraStarted ? stopCamera : startCamera}>
                <Text style={[styles.primaryBtnText, { color: cameraStarted ? theme.accentA : '#FFFFFF' }]}>{cameraStarted ? t.stopCamera : t.startCamera}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: signing ? theme.card : theme.accentB, borderColor: theme.accentB }]} onPress={signing ? stopSigning : startSigning}>
                <Text style={[styles.primaryBtnText, { color: signing ? theme.accentB : '#FFFFFF' }]}>{signing ? t.stopSigning : t.startSigning}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.clearBtn, { backgroundColor: theme.bg, borderColor: theme.border }]} onPress={clearAll}>
                <Text style={[styles.clearBtnText, { color: theme.text }]}>{t.clear}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.rightColumn}>
          <View style={[styles.sideCard, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
            <Text style={[styles.cardLabel, { color: theme.subtext }]}>System Status</Text>
            <Text style={[styles.sideStatus, { color: theme.text }]}>Backend: {backendStatus === 'ready' ? t.backendReady : backendStatus === 'missing' ? t.backendMissing : t.backendOffline}</Text>
            <Text style={[styles.sideStatus, { color: trackingStatus === 'ready' ? theme.accentA : trackingStatus === 'error' ? '#F72585' : theme.subtext }]}>Tracking: {trackingStatus === 'loading' ? t.trackingLoading : trackingStatus === 'ready' ? t.trackingReady : trackingStatus === 'missing' ? t.trackingMissing : trackingStatus === 'error' ? t.trackingError : '-'}</Text>
          </View>

          <View style={[styles.sideCard, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
            <Text style={[styles.cardLabel, { color: theme.subtext }]}>{t.demoTitle}</Text>
            <View style={styles.demoGrid}>
              {DEMO_PRESETS.map((preset) => (
                <TouchableOpacity key={preset.id} style={[styles.demoBtn, { borderColor: demoId === preset.id ? theme.accentA : theme.border, backgroundColor: demoId === preset.id ? theme.accentABg : theme.bg }]} onPress={() => runDemo(preset)}>
                  <Text style={[styles.demoBtnText, { color: demoId === preset.id ? theme.accentA : theme.text }]}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.sideCard, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
            <Text style={[styles.cardLabel, { color: theme.subtext }]}>{t.outputLabel}</Text>
            {result ? (
              <>
                <Text style={[styles.outputText, { color: theme.text }]}>{lang === 'hi' ? (SIGN_TO_HINDI[result.sign] || result.sign) : result.sign}</Text>
                {result.demoWord ? <Text style={[styles.sideNote, { color: theme.subtext }]}>{result.demoWord} ({result.step}/{result.totalSteps})</Text> : null}
                <View style={styles.metaRow}>
                  <View style={[styles.metaBadge, { borderColor: theme.accentA, backgroundColor: theme.accentABg }]}>
                    <Text style={[styles.metaBadgeText, { color: theme.accentA }]}>{t.confidence}: {result.confidence}%</Text>
                  </View>
                  <View style={[styles.metaBadge, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                    <Text style={[styles.metaBadgeText, { color: theme.subtext }]}>{result.mode === 'demo' ? 'Demo' : 'AI'}</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={[styles.sideNote, { color: theme.subtext }]}>{t.outputPlaceholder}</Text>
            )}
          </View>

          <View style={[styles.sideCard, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
            <Text style={[styles.cardLabel, { color: theme.subtext }]}>{t.historyTitle}</Text>
            {history.length > 0 ? (
              <View style={styles.historyList}>
                {history.map((entry, index) => (
                  <View key={`${entry.sign}-${entry.at}-${index}`} style={[styles.historyItem, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                    <Text style={[styles.historySign, { color: theme.text }]}>{entry.sign}</Text>
                    <Text style={[styles.historyMeta, { color: theme.subtext }]}>{entry.confidence}% • {entry.at}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.sideNote, { color: theme.subtext }]}>{t.historyEmpty}</Text>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function videoShellStyle(theme) {
  return {
    position: 'relative',
    width: '100%',
    minHeight: '360px',
    borderRadius: '26px',
    overflow: 'hidden',
    border: `1px solid ${theme.border}`,
    background: theme.bg,
  };
}

const videoStyle = {
  width: '100%',
  minHeight: '360px',
  objectFit: 'cover',
  display: 'block',
  transform: 'scaleX(-1)',
};

const canvasStyle = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  transform: 'scaleX(-1)',
  pointerEvents: 'none',
};

function videoOverlayStyle(theme) {
  return {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.bg,
  };
}

function videoOverlayCardStyle(theme) {
  return {
    width: '220px',
    height: '220px',
    borderRadius: '28px',
    border: `1px solid ${theme.border}`,
    background: theme.card,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '12px',
  };
}

const cameraIconStyle = {
  fontFamily: WEB_DISPLAY_FONT,
  fontSize: '42px',
  fontWeight: 800,
};

function cameraOverlayTextStyle(theme) {
  return {
    fontFamily: WEB_FONT_FAMILY,
    fontSize: '14px',
    color: theme.subtext,
    textAlign: 'center',
    padding: '0 16px',
  };
}

const styles = StyleSheet.create({
  root: { padding: 18, gap: 18 },
  topBar: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 36,
    elevation: 10,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoMark: { width: 58, height: 58, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logoMarkText: { fontSize: 20, fontWeight: '800', fontFamily: WEB_DISPLAY_FONT },
  logoName: { fontSize: 18, fontWeight: '800', fontFamily: WEB_DISPLAY_FONT },
  logoSub: { fontSize: 12, fontFamily: WEB_FONT_FAMILY, maxWidth: 420 },
  topButtons: { flexDirection: 'row', gap: 10 },
  smallBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, cursor: 'pointer' },
  smallBtnText: { fontSize: 12, fontWeight: '700', fontFamily: WEB_FONT_FAMILY },
  mainGrid: { flexDirection: 'row', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' },
  leftColumn: { flex: 1.25, minWidth: 320, gap: 18 },
  rightColumn: { flex: 0.85, minWidth: 300, gap: 18 },
  heroCard: { borderWidth: 1, borderRadius: 28, padding: 22, shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.12, shadowRadius: 36, elevation: 10 },
  heroEyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.6, marginBottom: 8, fontFamily: WEB_FONT_FAMILY },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 8, fontFamily: WEB_DISPLAY_FONT },
  subtitle: { fontSize: 14, lineHeight: 22, fontFamily: WEB_FONT_FAMILY },
  cameraCard: { borderWidth: 1, borderRadius: 28, padding: 18, shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.12, shadowRadius: 36, elevation: 10 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  primaryBtn: { flex: 1, minWidth: 150, borderWidth: 1, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', cursor: 'pointer' },
  primaryBtnText: { fontSize: 14, fontWeight: '700', fontFamily: WEB_FONT_FAMILY },
  clearBtn: { borderWidth: 1, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', cursor: 'pointer' },
  clearBtnText: { fontSize: 14, fontWeight: '700', fontFamily: WEB_FONT_FAMILY },
  sideCard: { borderWidth: 1, borderRadius: 28, padding: 18, shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.12, shadowRadius: 36, elevation: 10 },
  cardLabel: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontFamily: WEB_FONT_FAMILY },
  sideStatus: { fontSize: 14, fontWeight: '700', marginBottom: 8, fontFamily: WEB_FONT_FAMILY },
  sideNote: { fontSize: 13, lineHeight: 20, fontFamily: WEB_FONT_FAMILY },
  demoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  demoBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, minWidth: 74, alignItems: 'center', cursor: 'pointer' },
  demoBtnText: { fontSize: 12, fontWeight: '700', fontFamily: WEB_FONT_FAMILY },
  outputText: { fontSize: 40, fontWeight: '800', marginBottom: 10, fontFamily: WEB_DISPLAY_FONT },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 14 },
  metaBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  metaBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: WEB_FONT_FAMILY },
  historyList: { gap: 10 },
  historyItem: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  historySign: { fontSize: 16, fontWeight: '800', fontFamily: WEB_DISPLAY_FONT },
  historyMeta: { fontSize: 12, marginTop: 4, fontFamily: WEB_FONT_FAMILY },
});
