import { useState, useRef } from 'react';
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

const LANG = {
  en: {
    title:       'Deaf → Hearing',
    subtitle:    'Sign in front of camera — AI speaks it out',
    startBtn:    'Start Signing',
    stopBtn:     'Stop',
    clearBtn:    'Clear',
    outputLabel: 'TRANSLATION',
    placeholder: 'Sign output will appear here...',
    detecting:   '🟢 Detecting sign...',
    ready:       '⚪ Ready — press Start Signing',
    confidence:  'Confidence',
    speakBtn:    'Speak Again',
    allowCamera: 'Tap to allow camera',
    permHint:    'Camera permission required for sign detection',
    switchMode:  '↔ Switch to Voice Mode',
  },
  hi: {
    title:       'बधिर → सुनने वाला',
    subtitle:    'कैमरे के सामने साइन करें — AI बोलेगा',
    startBtn:    'साइन करें',
    stopBtn:     'रोकें',
    clearBtn:    'साफ़ करें',
    outputLabel: 'अनुवाद',
    placeholder: 'साइन का अनुवाद यहाँ दिखेगा...',
    detecting:   '🟢 संकेत पहचान रहे हैं...',
    ready:       '⚪ तैयार — साइन करें दबाएँ',
    confidence:  'सटीकता',
    speakBtn:    'दोबारा बोलें',
    allowCamera: 'कैमरा अनुमति दें',
    permHint:    'साइन पहचान के लिए कैमरा जरूरी है',
    switchMode:  '↔ वॉयस मोड पर जाएं',
  },
};

const MOCK_SIGNS = [
  { en: 'I need help',    hi: 'मुझे मदद चाहिए',   conf: 94 },
  { en: 'Call doctor',    hi: 'डॉक्टर बुलाओ',     conf: 91 },
  { en: 'I am in pain',   hi: 'मुझे दर्द है',      conf: 88 },
  { en: 'Thank you',      hi: 'धन्यवाद',           conf: 96 },
  { en: 'I am deaf',      hi: 'मैं बधिर हूँ',      conf: 97 },
  { en: 'Call police',    hi: 'पुलिस बुलाओ',       conf: 90 },
  { en: 'Water please',   hi: 'पानी दीजिए',        conf: 93 },
  { en: 'Emergency',      hi: 'आपातकाल',           conf: 98 },
  { en: 'I am lost',      hi: 'मैं खो गया हूँ',    conf: 86 },
  { en: 'I am hungry',    hi: 'मुझे भूख लगी है',   conf: 89 },
  { en: 'Where is toilet',hi: 'शौचालय कहाँ है',    conf: 85 },
  { en: 'I am diabetic',  hi: 'मुझे मधुमेह है',    conf: 87 },
];

export default function ModeAScreen({
  navigation,
  theme,
  lang,
  isDark,
  setIsDark,
  setLang,
}) {
  const t  = LANG[lang];
  const [active, setActive] = useState(false);
  const [result, setResult] = useState(null);
  const intervalRef         = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  const speakText = (text) => {
    Speech.stop();
    Speech.speak(text, {
      language: lang === 'hi' ? 'hi-IN' : 'en-US',
      pitch: 1.0,
      rate: 0.9,
    });
  };

  const startSigning = () => {
    setActive(true);
    setResult(null);
    let i = 0;
    intervalRef.current = setInterval(() => {
      const sign = MOCK_SIGNS[i % MOCK_SIGNS.length];
      setResult(sign);
      speakText(lang === 'hi' ? sign.hi : sign.en);
      i++;
    }, 2500);
  };

  const stop = () => {
    setActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    Speech.stop();
  };

  const clear = () => {
    stop();
    setResult(null);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>

      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: theme.border, backgroundColor: theme.header }]}>
        <View style={styles.logoRow}>
          <Text style={[styles.logoAccent, { color: theme.accentA }]}>⚡</Text>
          <Text style={[styles.logoName, { color: theme.headerText }]}>ISL Bridge</Text>
          <View style={[styles.modeBadge, { backgroundColor: theme.accentABg, borderColor: theme.accentA + '40' }]}>
            <Text style={[styles.modeBadgeText, { color: theme.accentA }]}>Mode A</Text>
          </View>
        </View>
        <View style={styles.topBtns}>
          <TouchableOpacity
            style={[styles.topBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
            onPress={() => setIsDark(d => !d)}>
            <Text>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.topBtn, { borderColor: theme.accentA, backgroundColor: theme.card }]}
            onPress={() => setLang(l => l === 'en' ? 'hi' : 'en')}>
            <Text style={[styles.topBtnText, { color: theme.accentA }]}>
              {lang === 'en' ? 'हि' : 'EN'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header card */}
        <View style={[styles.headerCard, { backgroundColor: theme.card, borderColor: theme.accentA + '40', borderLeftColor: theme.accentA }]}>
          <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>{t.subtitle}</Text>
        </View>

        {/* Status */}
        <Text style={[styles.status, { color: theme.subtext }]}>
          {active ? t.detecting : t.ready}
        </Text>

        {/* Camera */}
        {permission?.granted ? (
          <CameraView style={styles.cameraBox} facing="front">
            <View style={[styles.cameraTopBar, { backgroundColor: '#00000060' }]}>
              <Text style={[styles.cameraTopText, { color: theme.accentA }]}>
                {active ? '🟢 Live' : '⚪ Preview'}
              </Text>
            </View>
            {active && (
              <View style={[styles.cameraOverlay, { backgroundColor: '#00000060' }]}>
                <Text style={[styles.cameraOverlayText, { color: theme.accentA }]}>
                  🟢 {t.detecting}
                </Text>
              </View>
            )}
          </CameraView>
        ) : (
          <TouchableOpacity
            style={[styles.cameraBox, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={requestPermission}>
            <Text style={styles.cameraIcon}>📷</Text>
            <Text style={[styles.cameraText, { color: theme.subtext }]}>{t.allowCamera}</Text>
            <Text style={[styles.cameraHint, { color: theme.muted }]}>{t.permHint}</Text>
          </TouchableOpacity>
        )}

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: active ? theme.bg : theme.accentA,
                borderColor: theme.accentA,
                borderWidth: active ? 1.5 : 0 },
            ]}
            onPress={active ? stop : startSigning}>
            <Text style={[styles.primaryBtnText, { color: active ? theme.accentA : theme.bg }]}>
              {active ? t.stopBtn : t.startBtn}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.clearBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={clear}>
            <Text style={[styles.clearBtnText, { color: theme.subtext }]}>{t.clearBtn}</Text>
          </TouchableOpacity>
        </View>

        {/* Output card */}
        <View style={[
          styles.outputCard,
          { backgroundColor: theme.card, borderColor: result ? theme.accentA : theme.border },
        ]}>
          <Text style={[styles.outputLabel, { color: theme.subtext }]}>{t.outputLabel}</Text>
          {result ? (
            <>
              <Text style={[styles.outputText, { color: theme.text }]}>
                {lang === 'hi' ? result.hi : result.en}
              </Text>
              {lang === 'hi' && (
                <Text style={[styles.outputSub, { color: theme.subtext }]}>{result.en}</Text>
              )}
              <View style={styles.confRow}>
                <Text style={[styles.confBadge, { color: theme.accentA, borderColor: theme.accentA + '40' }]}>
                  {t.confidence}: {result.conf}%
                </Text>
                <TouchableOpacity
                  style={[styles.speakBtn, { backgroundColor: theme.accentABg, borderColor: theme.accentA + '40' }]}
                  onPress={() => speakText(lang === 'hi' ? result.hi : result.en)}>
                  <Text style={[styles.speakBtnText, { color: theme.accentA }]}>
                    🔊 {t.speakBtn}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={[styles.placeholder, { color: theme.placeholder }]}>{t.placeholder}</Text>
          )}
        </View>

        {/* Switch mode */}
        <TouchableOpacity
          style={[styles.switchMode, { borderColor: theme.border, backgroundColor: theme.card }]}
          onPress={() => navigation.navigate('ModeB')}>
          <Text style={[styles.switchModeText, { color: theme.subtext }]}>{t.switchMode}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:              { flex: 1 },
  topBar:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  logoRow:           { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoAccent:        { fontSize: 18 },
  logoName:          { fontSize: 15, fontWeight: 'bold' },
  modeBadge:         { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  modeBadgeText:     { fontSize: 10, fontWeight: 'bold' },
  topBtns:           { flexDirection: 'row', gap: 8 },
  topBtn:            { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topBtnText:        { fontSize: 13, fontWeight: 'bold' },
  scroll:            { padding: 16, paddingBottom: 40 },
  headerCard:        { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderLeftWidth: 4 },
  title:             { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  subtitle:          { fontSize: 12 },
  status:            { fontSize: 12, marginBottom: 12, marginLeft: 4 },
  cameraBox:         { borderRadius: 12, height: 240, marginBottom: 16, overflow: 'hidden', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cameraTopBar:      { position: 'absolute', top: 0, left: 0, right: 0, padding: 8 },
  cameraTopText:     { fontSize: 11, fontWeight: 'bold' },
  cameraOverlay:     { position: 'absolute', bottom: 12, left: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  cameraOverlayText: { fontSize: 12, fontWeight: 'bold' },
  cameraIcon:        { fontSize: 40, marginBottom: 8 },
  cameraText:        { fontSize: 14, marginBottom: 4 },
  cameraHint:        { fontSize: 11 },
  btnRow:            { flexDirection: 'row', gap: 12, marginBottom: 16 },
  primaryBtn:        { flex: 1, borderRadius: 10, padding: 15, alignItems: 'center' },
  primaryBtnText:    { fontSize: 15, fontWeight: 'bold' },
  clearBtn:          { borderRadius: 10, padding: 15, alignItems: 'center', borderWidth: 1, paddingHorizontal: 20 },
  clearBtnText:      { fontSize: 14 },
  outputCard:        { borderRadius: 12, padding: 20, borderWidth: 1, minHeight: 140, marginBottom: 16 },
  outputLabel:       { fontSize: 10, letterSpacing: 2, marginBottom: 12 },
  outputText:        { fontSize: 28, fontWeight: 'bold', marginBottom: 6 },
  outputSub:         { fontSize: 14, marginBottom: 12 },
  placeholder:       { fontSize: 13, fontStyle: 'italic' },
  confRow:           { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  confBadge:         { fontSize: 11, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 },
  speakBtn:          { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 },
  speakBtnText:      { fontSize: 11 },
  switchMode:        { borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1 },
  switchModeText:    { fontSize: 13 },
});