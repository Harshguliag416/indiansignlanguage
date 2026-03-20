import { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import * as SpeechRecognition from 'expo-speech-recognition';
import { AppContext } from '../AppContext';

const LANG = {
  en: {
    title: 'Hearing -> Deaf',
    subtitle: 'Speak clearly and the text appears for the other person to read.',
    startBtn: 'Speak Now',
    stopBtn: 'Stop',
    clearBtn: 'Clear',
    outputLabel: 'SPOKEN TEXT',
    placeholder: 'Speech will appear here in large text...',
    listening: 'Listening...',
    ready: 'Ready - press Speak Now',
    showBtn: 'Show Full Screen',
    backBtn: 'Back',
    clearFull: 'Clear',
    micIdle: 'Microphone ready',
    unsupported: 'Speech recognition on web works best in Chrome or Edge.',
  },
  hi: {
    title: 'Hearing -> Deaf',
    subtitle: 'Saaf bolein aur text saamne dikhai dega.',
    startBtn: 'Bolein',
    stopBtn: 'Rokein',
    clearBtn: 'Saaf Karein',
    outputLabel: 'BOLA GAYA TEXT',
    placeholder: 'Aapki awaaz ka text yahan dikhai dega...',
    listening: 'Sun rahe hain...',
    ready: 'Tayyar - Bolein dabayein',
    showBtn: 'Full Screen Dikhayein',
    backBtn: 'Wapas',
    clearFull: 'Saaf Karein',
    micIdle: 'Microphone tayyar hai',
    unsupported: 'Web speech recognition Chrome ya Edge mein sabse achha kaam karta hai.',
  },
};

const WEB_SPEECH_ERRORS = {
  aborted: 'Listening stopped.',
  'audio-capture': 'No microphone was detected on this device.',
  network: 'A network error interrupted speech recognition.',
  'not-allowed': 'Microphone access was blocked. Please allow mic permission in your browser.',
  'service-not-allowed': 'Speech recognition is blocked in this browser.',
  'no-speech': 'No speech was detected. Keep speaking and the app will continue listening.',
};

const getBrowserSpeechRecognition = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export default function ModeBScreen() {
  const { theme, lang, isDark, setIsDark, setLang } = useContext(AppContext);
  const t = LANG[lang];
  const locale = lang === 'hi' ? 'hi-IN' : 'en-US';
  const isWeb = Platform.OS === 'web';

  const [fullscreen, setFullscreen] = useState(false);
  const [webTranscript, setWebTranscript] = useState('');
  const [webIsRecording, setWebIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState('');

  const recognitionRef = useRef(null);
  const restartTimeoutRef = useRef(null);
  const shouldRestartRef = useRef(false);

  const speechHook = SpeechRecognition.useSpeechRecognition
    ? SpeechRecognition.useSpeechRecognition({ locale })
    : null;
  const nativeStartListening = speechHook?.start || (() => console.warn('Speech recognition is not supported.'));
  const nativeStopListening = speechHook?.stop || (() => {});
  const nativeIsRecording = speechHook?.isRecording || false;
  const nativeResults = speechHook?.results || [];
  const clearRecognition = speechHook?.clear || (() => {});

  const speechSupported = isWeb ? Boolean(getBrowserSpeechRecognition()) : Boolean(speechHook);
  const isRecording = isWeb ? webIsRecording : nativeIsRecording;
  const output = isWeb ? webTranscript.trim() : nativeResults.join(' ').trim();

  const clearRestartTimer = () => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  };

  const stopWebListening = () => {
    shouldRestartRef.current = false;
    clearRestartTimer();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
      }
    }

    setWebIsRecording(false);
  };

  const ensureWebRecognition = () => {
    const RecognitionCtor = getBrowserSpeechRecognition();
    if (!RecognitionCtor) {
      return null;
    }

    if (!recognitionRef.current) {
      const recognition = new RecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setWebIsRecording(true);
        setSpeechError('');
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript?.trim() || '')
          .filter(Boolean)
          .join(' ')
          .trim();

        setWebTranscript(transcript);
      };

      recognition.onerror = (event) => {
        const nextError = WEB_SPEECH_ERRORS[event.error] || `Speech recognition error: ${event.error}`;
        setSpeechError(nextError);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          shouldRestartRef.current = false;
        }

        setWebIsRecording(false);
      };

      recognition.onend = () => {
        if (shouldRestartRef.current) {
          clearRestartTimer();
          restartTimeoutRef.current = setTimeout(() => {
            try {
              recognition.start();
            } catch (error) {
              const message = String(error?.message || error || '');
              if (!/already started/i.test(message)) {
                shouldRestartRef.current = false;
                setWebIsRecording(false);
                setSpeechError('Unable to restart the microphone automatically.');
              }
            }
          }, 250);
          return;
        }

        setWebIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    recognitionRef.current.lang = locale;
    return recognitionRef.current;
  };

  const startWebListening = () => {
    const recognition = ensureWebRecognition();
    if (!recognition) {
      setSpeechError(t.unsupported);
      return;
    }

    shouldRestartRef.current = true;
    setSpeechError('');

    try {
      recognition.start();
    } catch (error) {
      const message = String(error?.message || error || '');
      if (!/already started/i.test(message)) {
        shouldRestartRef.current = false;
        setWebIsRecording(false);
        setSpeechError('Unable to start microphone. Please try again.');
      }
    }
  };

  const startListening = isWeb ? startWebListening : nativeStartListening;
  const stopListening = isWeb ? stopWebListening : nativeStopListening;

  const clear = () => {
    stopListening();
    if (isWeb) {
      setWebTranscript('');
      setSpeechError('');
    } else {
      clearRecognition();
    }
    setFullscreen(false);
  };

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = locale;
    }
  }, [locale]);

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      clearRestartTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
        }
      }
      nativeStopListening();
    };
  }, [nativeStopListening]);

  if (fullscreen && output) {
    return (
      <SafeAreaView style={[styles.fullRoot, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
        <TouchableOpacity style={styles.fullClose} onPress={() => setFullscreen(false)}>
          <Text style={[styles.fullCloseText, { color: isDark ? '#444444' : '#AAAAAA' }]}>{t.backBtn}</Text>
        </TouchableOpacity>
        <View style={styles.fullContent}>
          <Text style={[styles.fullText, { color: isDark ? '#FFFFFF' : '#0A0A1A' }]}>{output}</Text>
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
      <View style={[styles.topBar, { borderBottomColor: theme.border, backgroundColor: theme.header }]}> 
        <View style={styles.logoRow}>
          <Text style={[styles.logoAccent, { color: theme.accentB }]}>B</Text>
          <Text style={[styles.logoName, { color: theme.headerText }]}>ISL Bridge</Text>
          <View style={[styles.modeBadge, { backgroundColor: theme.accentBBg, borderColor: theme.accentB + '40' }]}>
            <Text style={[styles.modeBadgeText, { color: theme.accentB }]}>Mode B</Text>
          </View>
        </View>
        <View style={styles.topBtns}>
          <TouchableOpacity
            style={[styles.topBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
            onPress={() => setIsDark((current) => !current)}>
            <Text>{isDark ? 'L' : 'D'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.topBtn, { borderColor: theme.accentB, backgroundColor: theme.card }]}
            onPress={() => setLang((current) => (current === 'en' ? 'hi' : 'en'))}>
            <Text style={[styles.topBtnText, { color: theme.accentB }]}>{lang === 'en' ? 'HI' : 'EN'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.headerCard, { backgroundColor: theme.card, borderColor: theme.accentB + '40', borderLeftColor: theme.accentB }]}>
          <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>{t.subtitle}</Text>
        </View>

        <Text style={[styles.status, { color: theme.subtext }]}>{isRecording ? t.listening : t.ready}</Text>
        {!speechSupported && <Text style={[styles.helperText, { color: '#F72585' }]}>{t.unsupported}</Text>}
        {!!speechError && <Text style={[styles.helperText, { color: speechError.includes('blocked') ? '#F72585' : theme.subtext }]}>{speechError}</Text>}

        <View style={[
          styles.micBox,
          {
            backgroundColor: isRecording ? theme.accentBBg : theme.card,
            borderColor: isRecording ? theme.accentB : theme.border,
          },
        ]}>
          <Text style={styles.micIcon}>{isRecording ? 'ON' : 'MIC'}</Text>
          <Text style={[styles.micText, { color: theme.subtext }]}>{isRecording ? t.listening : t.micIdle}</Text>
          {isRecording && (
            <View style={styles.waveRow}>
              {[14, 22, 32, 22, 14, 22, 32, 22, 14].map((height, index) => (
                <View key={index} style={[styles.wave, { height, backgroundColor: theme.accentB }]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor: isRecording ? theme.bg : theme.accentB,
                borderColor: theme.accentB,
                borderWidth: isRecording ? 1.5 : 0,
                opacity: speechSupported ? 1 : 0.5,
              },
            ]}
            onPress={isRecording ? stopListening : startListening}
            disabled={!speechSupported}>
            <Text style={[styles.primaryBtnText, { color: isRecording ? theme.accentB : '#FFFFFF' }]}>
              {isRecording ? t.stopBtn : t.startBtn}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.clearBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={clear}>
            <Text style={[styles.clearBtnText, { color: theme.subtext }]}>{t.clearBtn}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.outputCard, { backgroundColor: theme.card, borderColor: output ? theme.accentB : theme.border }]}>
          <Text style={[styles.outputLabel, { color: theme.subtext }]}>{t.outputLabel}</Text>
          {output ? (
            <>
              <Text style={[styles.outputText, { color: theme.text }]}>{output}</Text>
              <TouchableOpacity
                style={[styles.showBtn, { backgroundColor: theme.accentBBg, borderColor: theme.accentB + '50' }]}
                onPress={() => setFullscreen(true)}>
                <Text style={[styles.showBtnText, { color: theme.accentB }]}>{t.showBtn}</Text>
              </TouchableOpacity>
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
  topBtns: { flexDirection: 'row', gap: 8 },
  topBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topBtnText: { fontSize: 13, fontWeight: 'bold' },
  scroll: { padding: 16, paddingBottom: 40 },
  headerCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderLeftWidth: 4 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 12 },
  status: { fontSize: 12, marginBottom: 8, marginLeft: 4 },
  helperText: { fontSize: 12, marginBottom: 8, marginLeft: 4 },
  micBox: { borderRadius: 12, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, gap: 8 },
  micIcon: { fontSize: 28, fontWeight: 'bold' },
  micText: { fontSize: 13 },
  waveRow: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 8 },
  wave: { width: 4, borderRadius: 2 },
  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  primaryBtn: { flex: 1, borderRadius: 10, padding: 15, alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: 'bold' },
  clearBtn: { borderRadius: 10, padding: 15, alignItems: 'center', borderWidth: 1, paddingHorizontal: 20 },
  clearBtnText: { fontSize: 14 },
  outputCard: { borderRadius: 12, padding: 20, borderWidth: 1, minHeight: 140, marginBottom: 16 },
  outputLabel: { fontSize: 10, letterSpacing: 2, marginBottom: 12 },
  outputText: { fontSize: 26, fontWeight: 'bold', lineHeight: 36, marginBottom: 16 },
  placeholder: { fontSize: 13, fontStyle: 'italic' },
  showBtn: { borderWidth: 1, borderRadius: 10, padding: 13, alignItems: 'center' },
  showBtnText: { fontSize: 13, fontWeight: 'bold' },
  fullRoot: { flex: 1 },
  fullClose: { padding: 20 },
  fullCloseText: { fontSize: 14 },
  fullContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  fullText: { fontSize: 52, fontWeight: 'bold', textAlign: 'center', lineHeight: 68 },
  fullClear: { margin: 24, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1 },
  fullClearText: { fontSize: 14 },
});
