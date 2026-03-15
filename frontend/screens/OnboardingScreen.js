import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const LANG = {
  en: {
    welcome:    'Welcome to ISL Bridge',
    subtitle:   'Choose how you want to communicate',
    modeATitle: 'Deaf → Hearing',
    modeADesc:  'Sign in front of camera. AI detects your gesture and speaks it aloud for the hearing person.',
    modeBTitle: 'Hearing → Deaf',
    modeBDesc:  'Speak into the mic. Your words appear as large clear text for the deaf person to read.',
    bothTitle:  'Both Modes',
    bothDesc:   'Switch between signing and speaking anytime during the conversation.',
    continueBtn:'Continue',
    langSwitch: 'हिंदी में देखें',
    themeSwitch: 'Light Mode',
    selectMode: 'Select a mode to continue',
  },
  hi: {
    welcome:    'ISL Bridge में स्वागत है',
    subtitle:   'बताएं आप कैसे बात करना चाहते हैं',
    modeATitle: 'बधिर → सुनने वाला',
    modeADesc:  'कैमरे के सामने साइन करें। AI आपका संकेत पहचानकर सुनने वाले के लिए बोलेगा।',
    modeBTitle: 'सुनने वाला → बधिर',
    modeBDesc:  'माइक में बोलें। आपके शब्द बड़े अक्षरों में दिखेंगे जो बधिर व्यक्ति पढ़ सकें।',
    bothTitle:  'दोनों मोड',
    bothDesc:   'बातचीत के दौरान कभी भी साइन और बोलने के बीच स्विच करें।',
    continueBtn:'आगे बढ़ें',
    langSwitch: 'Switch to English',
    themeSwitch: 'लाइट मोड',
    selectMode: 'आगे बढ़ने के लिए मोड चुनें',
  },
};

export default function OnboardingScreen({
  navigation,
  theme,
  isDark,
  setIsDark,
  lang,
  setLang,
}) {
  const [selectedMode, setSelectedMode] = useState(null);
  const t = LANG[lang];

  const modes = [
    {
      id: 'A',
      icon: '🤟',
      title: t.modeATitle,
      desc: t.modeADesc,
      accent: theme.accentA,
      accentBg: theme.accentABg,
      screen: 'ModeA',
    },
    {
      id: 'B',
      icon: '🎤',
      title: t.modeBTitle,
      desc: t.modeBDesc,
      accent: theme.accentB,
      accentBg: theme.accentBBg,
      screen: 'ModeB',
    },
    {
      id: 'BOTH',
      icon: '↔️',
      title: t.bothTitle,
      desc: t.bothDesc,
      accent: theme.accentA,
      accentBg: theme.accentABg,
      screen: 'ModeA',
    },
  ];

  const handleContinue = () => {
    if (!selectedMode) return;
    const mode = modes.find(m => m.id === selectedMode);
    navigation.navigate('Permission', {
      targetScreen: mode.screen,
      mode: selectedMode,
    });
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>

      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <View style={styles.logoRow}>
          <Text style={[styles.logoAccent, { color: theme.accentA }]}>⚡</Text>
          <Text style={[styles.logoName, { color: theme.text }]}>ISL Bridge</Text>
          <Text style={[styles.logoTeam, { color: theme.subtext }]}>Team ALPHA</Text>
        </View>
        <View style={styles.topBtns}>
          {/* Theme toggle */}
          <TouchableOpacity
            style={[styles.topBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
            onPress={() => setIsDark(d => !d)}>
            <Text style={styles.topBtnIcon}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          {/* Lang toggle */}
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

        {/* Header */}
        <Text style={[styles.welcome, { color: theme.text }]}>{t.welcome}</Text>
        <Text style={[styles.subtitle, { color: theme.subtext }]}>{t.subtitle}</Text>

        {/* Mode cards */}
        {modes.map(mode => (
          <TouchableOpacity
            key={mode.id}
            onPress={() => setSelectedMode(mode.id)}
            style={[
              styles.modeCard,
              {
                backgroundColor: theme.card,
                borderColor: selectedMode === mode.id ? mode.accent : theme.border,
                borderWidth: selectedMode === mode.id ? 2 : 1,
              },
            ]}>

            {/* Left accent bar */}
            {selectedMode === mode.id && (
              <View style={[styles.cardAccentBar, { backgroundColor: mode.accent }]} />
            )}

            <View style={[styles.iconCircle, { backgroundColor: mode.accentBg, borderColor: mode.accent + '40' }]}>
              <Text style={styles.modeIcon}>{mode.icon}</Text>
            </View>

            <View style={styles.modeContent}>
              <Text style={[styles.modeTitle, { color: mode.accent }]}>{mode.title}</Text>
              <Text style={[styles.modeDesc, { color: theme.subtext }]}>{mode.desc}</Text>
            </View>

            {selectedMode === mode.id && (
              <Text style={[styles.checkmark, { color: mode.accent }]}>✓</Text>
            )}

          </TouchableOpacity>
        ))}

        {/* Continue button */}
        <TouchableOpacity
          style={[
            styles.continueBtn,
            {
              backgroundColor: selectedMode ? theme.accentA : theme.card,
              borderColor: selectedMode ? theme.accentA : theme.border,
            },
          ]}
          onPress={handleContinue}>
          <Text
            style={[
              styles.continueBtnText,
              { color: selectedMode ? theme.bg : theme.subtext },
            ]}>
            {selectedMode ? t.continueBtn : t.selectMode}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1 },
  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  logoRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoAccent:     { fontSize: 18 },
  logoName:       { fontSize: 16, fontWeight: 'bold' },
  logoTeam:       { fontSize: 10, marginTop: 2 },
  topBtns:        { flexDirection: 'row', gap: 8 },
  topBtn:         { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topBtnIcon:     { fontSize: 16 },
  topBtnText:     { fontSize: 13, fontWeight: 'bold' },
  scroll:         { padding: 16, paddingBottom: 48 },
  welcome:        { fontSize: 24, fontWeight: 'bold', marginBottom: 6, marginTop: 8 },
  subtitle:       { fontSize: 13, marginBottom: 24 },
  modeCard:       { borderRadius: 14, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden', position: 'relative' },
  cardAccentBar:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  iconCircle:     { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modeIcon:       { fontSize: 26 },
  modeContent:    { flex: 1 },
  modeTitle:      { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  modeDesc:       { fontSize: 12, lineHeight: 18 },
  checkmark:      { fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  continueBtn:    { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1.5 },
  continueBtnText:{ fontSize: 15, fontWeight: 'bold' },
});