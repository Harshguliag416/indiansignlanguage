import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';

const LANG = {
  en: {
    title:       'Hearing → Deaf',
    subtitle:    'Speak clearly — text appears for deaf person to read',
    startBtn:    'Speak Now',
    stopBtn:     'Stop',
    clearBtn:    'Clear',
    outputLabel: 'SPOKEN TEXT',
    placeholder: 'Speech will appear here in large text...',
    listening:   '🔴 Listening...',
    ready:       '⚪ Ready — press Speak Now',
    showBtn:     'Show to Deaf Person',
    backBtn:     '✕ Back',
    clearFull:   'Clear',
    switchMode:  '↔ Switch to Sign Mode',
  },
  hi: {
    title:       'सुनने वाला → बधिर',
    subtitle:    'साफ़ बोलें — बधिर व्यक्ति के लिए टेक्स्ट दिखेगा',
    startBtn:    'बोलें',
    stopBtn:     'रोकें',
    clearBtn:    'साफ़ करें',
    outputLabel: 'बोला गया',
    placeholder: 'बड़े अक्षरों में यहाँ दिखेगा...',
    listening:   '🔴 सुन रहे हैं...',
    ready:       '⚪ तैयार — बोलें दबाएँ',
    showBtn:     'बधिर व्यक्ति को दिखाएँ',
    backBtn:     '✕ वापस',
    clearFull:   'साफ़ करें',
    switchMode:  '↔ साइन मोड पर जाएं',
  },
};

const MOCK_PHRASES = {
  en: [
    'Where does it hurt?',
    'What is your name?',
    'Are you feeling okay?',
    'Please wait here.',
    'I will help you.',
    'Do you need water?',
    'Can you write it down?',
    'Stay calm, help is coming.',
    'What medicine do you take?',
    'Is there anyone with you?',
  ],
  hi: [
    'दर्द कहाँ है?',
    'आपका नाम क्या है?',
    'क्या आप ठीक हैं?',
    'यहाँ रुकिए।',
    'मैं आपकी मदद करूँगा।',
    'क्या पानी चाहिए?',
    'लिखकर बताइए।',
    'शांत रहिए, मदद आ रही है।',
    'कौन सी दवाई लेते हैं?',
    'क्या कोई आपके साथ है?',
  ],
};

export default function ModeBScreen({
  navigation,
  theme,
  lang,
  isDark,
  setIsDark,
  setLang,
}) {
  const t = LANG[lang];
  const [active, setActive]         = useState(false);
  const [output, setOutput]         = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const intervalRef                 = useRef(null);

  const startListening = () => {
    setActive(true);
    setOutput('');
    let i = 0;
    intervalRef.current = setInterval(() => {
      const phrases = MOCK_PHRASES[lang];
      setOutput(phrases[i % phrases.length]);
      i++;
    }, 2500);
  };

  const stop = () => {
    setActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const clear = () => {
    stop();
    setOutput('');
    setFullscreen(false);
  };

  // ── Fullscreen mode ────────────────────────────────────
  if (fullscreen && output) {
    return (
      <SafeAreaView style={[styles.fullRoot, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
        <TouchableOpacity
          style={styles.fullClose}
          onPress={() => setFullscreen(false)}>
          <Text style={[styles.fullCloseText, { color: isDark ? '#444444' : '#AAAAAA' }]}>
            {t.backBtn}
          </Text>
        </TouchableOpacity>
        <View style={styles.fullContent}>
          <Text style={[styles.fullText, { color: isDark ? '#FFFFFF' : '#0A0A1A' }]}>
            {output}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.fullClear, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={clear}>
          <Text style={[styles.fullClearText, { color: theme.subtext }]}>{t.clearFull}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>

      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: theme.border, backgroundColor: theme.header }]}>
        <View style={styles.logoRow}>
          <Text style={[styles.logoAccent, { color: theme.accentB }]}>⚡</Text>
          <Text style={[styles.logoName, { color: theme.headerText }]}>ISL Bridge</Text>
          <View style={[styles.modeBadge, { backgroundColor: theme.accentBBg, borderColor: theme.accentB + '40' }]}>
            <Text style={[styles.modeBadgeText, { color: theme.accentB }]}>Mode B</Text>
          </View>
        </View>
        <View style={styles.topBtns}>
          <TouchableOpacity
            style={[styles.topBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
            onPress={() => setIsDark(d => !d)}>
            <Text>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.topBtn, { borderColor: theme.accentB, backgroundColor: theme.card }]}
            onPress={() => setLang(l => l === 'en' ? 'hi' : 'en')}>
            <Text style={[styles.topBtnText, { color: theme.accentB }]}>
              {lang === 'en' ? 'हि' : 'EN'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header card */}
        <View style={[styles.headerCard, { backgroundColor: theme.card, borderColor: theme.accentB + '40', borderLeftColor: theme.accentB }]}>
          <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>{t.subtitle}</Text>
        </View>

        {/* Status */}
        <Text style={[styles.status, { color: theme.subtext }]}>
          {active ? t.listening : t.ready}
        </Text>

        {/* Mic visual */}
        <View style={[
          styles.micBox,
          {
            backgroundColor: active ? theme.accentBBg : theme.card,
            borderColor: active ? theme.accentB : theme.border,
          },
        ]}>
          <Text style={styles.micIcon}>{active ? '🎙️' : '🎤'}</Text>
          <Text style={[styles.micText, { color: theme.subtext }]}>
            {active ? t.listening : 'Microphone'}
          </Text>
          {active && (
            <View style={styles.waveRow}>
              {[14, 22, 32, 22, 14, 22, 32, 22, 14].map((h, i) => (
                <View
                  key={i}
                  style={[styles.wave, { height: h, backgroundColor: theme.accentB }]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor: active ? theme.bg : theme.accentB,
                borderColor: theme.accentB,
                borderWidth: active ? 1.5 : 0,
              },
            ]}
            onPress={active ? stop : startListening}>
            <Text style={[styles.primaryBtnText, { color: active ? theme.accentB : '#FFFFFF' }]}>
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
          { backgroundColor: theme.card, borderColor: output ? theme.accentB : theme.border },
        ]}>
          <Text style={[styles.outputLabel, { color: theme.subtext }]}>{t.outputLabel}</Text>
          {output ? (
            <>
              <Text style={[styles.outputText, { color: theme.text }]}>{output}</Text>
              <TouchableOpacity
                style={[styles.showBtn, { backgroundColor: theme.accentBBg, borderColor: theme.accentB + '50' }]}
                onPress={() => setFullscreen(true)}>
                <Text style={[styles.showBtnText, { color: theme.accentB }]}>
                  ⛶  {t.showBtn}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={[styles.placeholder, { color: theme.placeholder }]}>{t.placeholder}</Text>
          )}
        </View>

        {/* Switch mode */}
        <TouchableOpacity
          style={[styles.switchMode, { borderColor: theme.border, backgroundColor: theme.card }]}
          onPress={() => navigation.navigate('ModeA')}>
          <Text style={[styles.switchModeText, { color: theme.subtext }]}>{t.switchMode}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  topBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  logoRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoAccent:    { fontSize: 18 },
  logoName:      { fontSize: 15, fontWeight: 'bold' },
  modeBadge:     { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  modeBadgeText: { fontSize: 10, fontWeight: 'bold' },
  topBtns:       { flexDirection: 'row', gap: 8 },
  topBtn:        { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topBtnText:    { fontSize: 13, fontWeight: 'bold' },
  scroll:        { padding: 16, paddingBottom: 40 },
  headerCard:    { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderLeftWidth: 4 },
  title:         { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  subtitle:      { fontSize: 12 },
  status:        { fontSize: 12, marginBottom: 12, marginLeft: 4 },
  micBox:        { borderRadius: 12, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, gap: 8 },
  micIcon:       { fontSize: 44 },
  micText:       { fontSize: 13 },
  waveRow:       { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 8 },
  wave:          { width: 4, borderRadius: 2 },
  btnRow:        { flexDirection: 'row', gap: 12, marginBottom: 16 },
  primaryBtn:    { flex: 1, borderRadius: 10, padding: 15, alignItems: 'center' },
  primaryBtnText:{ fontSize: 15, fontWeight: 'bold' },
  clearBtn:      { borderRadius: 10, padding: 15, alignItems: 'center', borderWidth: 1, paddingHorizontal: 20 },
  clearBtnText:  { fontSize: 14 },
  outputCard:    { borderRadius: 12, padding: 20, borderWidth: 1, minHeight: 140, marginBottom: 16 },
  outputLabel:   { fontSize: 10, letterSpacing: 2, marginBottom: 12 },
  outputText:    { fontSize: 26, fontWeight: 'bold', lineHeight: 36, marginBottom: 16 },
  placeholder:   { fontSize: 13, fontStyle: 'italic' },
  showBtn:       { borderWidth: 1, borderRadius: 10, padding: 13, alignItems: 'center' },
  showBtnText:   { fontSize: 13, fontWeight: 'bold' },
  switchMode:    { borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1 },
  switchModeText:{ fontSize: 13 },
  fullRoot:      { flex: 1 },
  fullClose:     { padding: 20 },
  fullCloseText: { fontSize: 14 },
  fullContent:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  fullText:      { fontSize: 52, fontWeight: 'bold', textAlign: 'center', lineHeight: 68 },
  fullClear:     { margin: 24, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1 },
  fullClearText: { fontSize: 14 },
});