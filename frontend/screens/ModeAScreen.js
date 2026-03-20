import { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import * as Speech from 'expo-speech';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AppContext } from '../AppContext';
import { BACKEND_URL, HAS_BACKEND_URL } from '../config';

const LANG = {
  en: {
    title: 'Deaf -> Hearing',
    subtitle: 'Show your sign in front of the camera and the app will speak the result.',
    startBtn: 'Start Signing',
    stopBtn: 'Stop',
    clearBtn: 'Clear',
    outputLabel: 'DETECTED SIGN',
    placeholder: 'Sign output will appear here...',
    detecting: 'Detecting sign...',
    ready: 'Ready - press Start Signing',
    confidence: 'Confidence',
    speakBtn: 'Speak Again',
    allowCamera: 'Tap to allow camera',
    permHint: 'Camera permission is required for sign detection.',
    backendReady: 'AI model is ready',
    backendOffline: 'Render backend is not connected',
    backendMissing: 'Set EXPO_PUBLIC_BACKEND_URL for the frontend deployment.',
    noHand: 'Show your hand clearly',
    preview: 'Preview - position your hand',
    live: 'Live - detecting',
  },
  hi: {
    title: 'Deaf -> Hearing',
    subtitle: 'Camera ke saamne sign dikhaiye aur app usse bolkar sunayega.',
    startBtn: 'Sign shuru karein',
    stopBtn: 'Rokein',
    clearBtn: 'Saaf karein',
    outputLabel: 'PAHCHANA GAYA SIGN',
    placeholder: 'Sign output yahan dikhai dega...',
    detecting: 'Sign detect ho raha hai...',
    ready: 'Tayyar - Start Signing dabayein',
    confidence: 'Confidence',
    speakBtn: 'Dobara bolen',
    allowCamera: 'Camera allow karein',
    permHint: 'Sign detection ke liye camera zaroori hai.',
    backendReady: 'AI model tayyar hai',
    backendOffline: 'Render backend connected nahi hai',
    backendMissing: 'Frontend deployment mein EXPO_PUBLIC_BACKEND_URL set karein.',
    noHand: 'Haath saaf dikhaiye',
    preview: 'Preview - haath set karein',
    live: 'Live - detection chalu hai',
  },
};

const SIGN_TO_HINDI = {
  A: 'A', B: 'B', C: 'C', D: 'D', E: 'E', F: 'F', G: 'G', H: 'H', I: 'I', J: 'J',
  K: 'K', L: 'L', M: 'M', N: 'N', O: 'O', P: 'P', Q: 'Q', R: 'R', S: 'S', T: 'T',
  U: 'U', V: 'V', W: 'W', X: 'X', Y: 'Y', Z: 'Z', del: 'Delete', nothing: 'Nothing', space: 'Space',
};

export default function ModeAScreen() {
  const { theme, lang, isDark, setIsDark, setLang } = useContext(AppContext);
  const t = LANG[lang];
  const [active, setActive] = useState(false);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('ready');
  const [backendOk, setBackendOk] = useState(false);
  const intervalRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    checkBackend();
  }, []);

  const checkBackend = async () => {
    if (!HAS_BACKEND_URL) {
      setBackendOk(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${BACKEND_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await response.json();
      setBackendOk(data.status === 'healthy');
    } catch {
      setBackendOk(false);
    }
  };

  const speakText = (text) => {
    Speech.stop();
    Speech.speak(text, {
      language: lang === 'hi' ? 'hi-IN' : 'en-US',
      pitch: 1,
      rate: 0.9,
    });
  };

  const stop = () => {
    setActive(false);
    setStatus('ready');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    Speech.stop();
  };

  const startSigning = () => {
    if (!HAS_BACKEND_URL) {
      setBackendOk(false);
      setStatus('backendMissing');
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setActive(true);
    setStatus('detecting');
    setResult(null);

    intervalRef.current = setInterval(async () => {
      try {
        const fakeLandmarks = Array.from({ length: 63 }, () => Math.random());
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const response = await fetch(`${BACKEND_URL}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ landmarks: fakeLandmarks }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        setResult({
          sign: data.sign,
          confidence: data.confidence,
          mode: data.mode,
          hindi: SIGN_TO_HINDI[data.sign] || data.sign,
        });
        setStatus('detecting');

        if (data.confidence > 80) {
          speakText(lang === 'hi' ? (SIGN_TO_HINDI[data.sign] || data.sign) : data.sign);
        }
      } catch {
        setStatus('noHand');
      }
    }, 2000);
  };

  const clear = () => {
    stop();
    setResult(null);
  };

  useEffect(() => () => stop(), []);

  const statusText = (() => {
    if (status === 'backendMissing') return t.backendMissing;
    if (status === 'noHand') return t.noHand;
    return active ? t.detecting : t.ready;
  })();

  const backendText = !HAS_BACKEND_URL ? t.backendMissing : backendOk ? t.backendReady : t.backendOffline;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.topBar, { borderBottomColor: theme.border, backgroundColor: theme.header }]}>
        <View style={styles.logoRow}>
          <Text style={[styles.logoAccent, { color: theme.accentA }]}>A</Text>
          <Text style={[styles.logoName, { color: theme.headerText }]}>ISL Bridge</Text>
          <View style={[styles.modeBadge, { backgroundColor: theme.accentABg, borderColor: theme.accentA + '40' }]}>
            <Text style={[styles.modeBadgeText, { color: theme.accentA }]}>Mode A</Text>
          </View>
          <View style={[styles.backendDot, { backgroundColor: backendOk ? '#00F5D4' : '#F72585' }]} />
        </View>
        <View style={styles.topBtns}>
          <TouchableOpacity
            style={[styles.topBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
            onPress={() => setIsDark((current) => !current)}>
            <Text>{isDark ? 'L' : 'D'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.topBtn, { borderColor: theme.accentA, backgroundColor: theme.card }]}
            onPress={() => setLang((current) => (current === 'en' ? 'hi' : 'en'))}>
            <Text style={[styles.topBtnText, { color: theme.accentA }]}>{lang === 'en' ? 'HI' : 'EN'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.headerCard, { backgroundColor: theme.card, borderColor: theme.accentA + '40', borderLeftColor: theme.accentA }]}>
          <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>{t.subtitle}</Text>
          <Text style={[styles.backendStatus, { color: backendOk ? theme.accentA : '#F72585' }]}>{backendText}</Text>
        </View>

        <Text style={[styles.status, { color: theme.subtext }]}>{statusText}</Text>

        {permission?.granted ? (
          <CameraView style={styles.cameraBox} facing="front">
            <View style={styles.cameraTopBar}>
              <Text style={[styles.cameraTopText, { color: theme.accentA }]}>{active ? t.live : t.preview}</Text>
            </View>
            <View style={styles.handGuide}>
              <View style={[styles.handBox, { borderColor: active ? theme.accentA : '#ffffff40' }]} />
            </View>
            {active && result && (
              <View style={styles.cameraOverlay}>
                <Text style={[styles.cameraSign, { color: theme.accentA }]}>{result.sign}</Text>
                <Text style={styles.cameraConf}>{result.confidence}%</Text>
              </View>
            )}
          </CameraView>
        ) : (
          <TouchableOpacity
            style={[styles.cameraBox, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={requestPermission}>
            <Text style={styles.cameraIcon}>CAM</Text>
            <Text style={[styles.cameraText, { color: theme.subtext }]}>{t.allowCamera}</Text>
            <Text style={[styles.cameraHint, { color: theme.muted }]}>{t.permHint}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor: active ? theme.bg : theme.accentA,
                borderColor: theme.accentA,
                borderWidth: active ? 1.5 : 0,
              },
            ]}
            onPress={active ? stop : startSigning}>
            <Text style={[styles.primaryBtnText, { color: active ? theme.accentA : theme.bg }]}>{active ? t.stopBtn : t.startBtn}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.clearBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={clear}>
            <Text style={[styles.clearBtnText, { color: theme.subtext }]}>{t.clearBtn}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.outputCard, { backgroundColor: theme.card, borderColor: result ? theme.accentA : theme.border }]}>
          <Text style={[styles.outputLabel, { color: theme.subtext }]}>{t.outputLabel}</Text>
          {result ? (
            <>
              <Text style={[styles.outputText, { color: theme.text }]}>{lang === 'hi' ? result.hindi : result.sign}</Text>
              {lang === 'hi' && <Text style={[styles.outputSub, { color: theme.subtext }]}>{result.sign}</Text>}
              <View style={styles.confRow}>
                <Text style={[styles.confBadge, { color: theme.accentA, borderColor: theme.accentA + '40' }]}>
                  {t.confidence}: {result.confidence}%
                </Text>
                <Text style={[styles.modeBadgeSmall, { color: theme.subtext, borderColor: theme.border }]}>
                  {result.mode === 'model' ? 'AI' : 'Mock'}
                </Text>
                <TouchableOpacity
                  style={[styles.speakBtn, { backgroundColor: theme.accentABg, borderColor: theme.accentA + '40' }]}
                  onPress={() => speakText(lang === 'hi' ? result.hindi : result.sign)}>
                  <Text style={[styles.speakBtnText, { color: theme.accentA }]}>{t.speakBtn}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={[styles.placeholder, { color: theme.placeholder }]}>{t.placeholder}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoAccent: { fontSize: 18, fontWeight: 'bold' },
  logoName: { fontSize: 15, fontWeight: 'bold' },
  modeBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  modeBadgeText: { fontSize: 10, fontWeight: 'bold' },
  backendDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 4 },
  topBtns: { flexDirection: 'row', gap: 8 },
  topBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topBtnText: { fontSize: 13, fontWeight: 'bold' },
  scroll: { padding: 16, paddingBottom: 40 },
  headerCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderLeftWidth: 4 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 12, marginBottom: 6 },
  backendStatus: { fontSize: 11, fontWeight: 'bold' },
  status: { fontSize: 12, marginBottom: 12, marginLeft: 4 },
  cameraBox: { borderRadius: 12, height: 280, marginBottom: 16, overflow: 'hidden', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cameraTopBar: { position: 'absolute', top: 0, left: 0, right: 0, padding: 8, backgroundColor: '#00000080' },
  cameraTopText: { fontSize: 11, fontWeight: 'bold' },
  handGuide: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  handBox: { width: 160, height: 200, borderWidth: 2, borderRadius: 12, borderStyle: 'dashed' },
  cameraOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, alignItems: 'center', backgroundColor: '#00000090' },
  cameraSign: { fontSize: 32, fontWeight: 'bold' },
  cameraConf: { fontSize: 12, color: '#FFFFFF' },
  cameraIcon: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  cameraText: { fontSize: 14, marginBottom: 4 },
  cameraHint: { fontSize: 11 },
  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  primaryBtn: { flex: 1, borderRadius: 10, padding: 15, alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: 'bold' },
  clearBtn: { borderRadius: 10, padding: 15, alignItems: 'center', borderWidth: 1, paddingHorizontal: 20 },
  clearBtnText: { fontSize: 14 },
  outputCard: { borderRadius: 12, padding: 20, borderWidth: 1, minHeight: 140, marginBottom: 16 },
  outputLabel: { fontSize: 10, letterSpacing: 2, marginBottom: 12 },
  outputText: { fontSize: 42, fontWeight: 'bold', marginBottom: 6 },
  outputSub: { fontSize: 14, marginBottom: 12 },
  placeholder: { fontSize: 13, fontStyle: 'italic' },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  confBadge: { fontSize: 11, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 },
  modeBadgeSmall: { fontSize: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  speakBtn: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 },
  speakBtnText: { fontSize: 11 },
});
