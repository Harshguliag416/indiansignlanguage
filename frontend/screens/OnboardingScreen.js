import { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { AppContext } from '../AppContext';

const LANG = {
  en: {
    team: 'TEAM ALPHA',
    welcome: 'Who are you?',
    subtitle: 'Choose the communication role that fits you best. The app will open in that mode and only ask for the permissions needed for it.',
    deafTitle: 'Deaf / Sign User',
    deafDesc: 'Use sign-to-speech so your signs can be spoken for a hearing person.',
    hearingTitle: 'Hearing / Speaker',
    hearingDesc: 'Use speech-to-text so your spoken words appear for a deaf person to read.',
    bothTitle: 'Both',
    bothDesc: 'Keep both modes available and switch during the conversation.',
    continueBtn: 'Continue',
    selectMode: 'Select your role to continue',
  },
  hi: {
    team: 'TEAM ALPHA',
    welcome: 'Aap kaun hain?',
    subtitle: 'Apni communication role chunen. App ussi ke hisaab se mode set karega aur sirf zaroori permissions maangega.',
    deafTitle: 'Badhir / Sign User',
    deafDesc: 'Sign-to-speech mode use karein taa ki aapke signs hearing user ke liye bole ja saken.',
    hearingTitle: 'Hearing / Speaker',
    hearingDesc: 'Speech-to-text mode use karein taa ki aapki awaaz text ban kar saamne dikhe.',
    bothTitle: 'Dono',
    bothDesc: 'Dono modes available rakhein aur zarurat par switch karein.',
    continueBtn: 'Aage badhein',
    selectMode: 'Aage badhne ke liye role chunen',
  },
};

export default function OnboardingScreen({ navigation }) {
  const [selectedMode, setSelectedMode] = useState(null);
  const { theme, lang } = useContext(AppContext);
  const t = LANG[lang];

  const modes = [
    {
      id: 'A',
      badge: 'A',
      title: t.deafTitle,
      desc: t.deafDesc,
      accent: theme.accentA,
      accentBg: theme.accentABg,
      screen: 'ModeA',
    },
    {
      id: 'B',
      badge: 'B',
      title: t.hearingTitle,
      desc: t.hearingDesc,
      accent: theme.accentB,
      accentBg: theme.accentBBg,
      screen: 'ModeB',
    },
    {
      id: 'BOTH',
      badge: 'AB',
      title: t.bothTitle,
      desc: t.bothDesc,
      accent: theme.accentC,
      accentBg: theme.accentCBg,
      screen: 'ModeA',
    },
  ];

  const handleContinue = () => {
    if (!selectedMode) {
      return;
    }

    const mode = modes.find((item) => item.id === selectedMode);
    navigation.navigate('Permission', {
      targetScreen: 'Main',
      mode: selectedMode,
      initialTab: mode.screen,
    });
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}> 
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.team, { color: theme.accentA }]}>{t.team}</Text>
        <Text style={[styles.welcome, { color: theme.text }]}>{t.welcome}</Text>
        <Text style={[styles.subtitle, { color: theme.subtext }]}>{t.subtitle}</Text>

        {modes.map((mode) => {
          const selected = selectedMode === mode.id;
          return (
            <TouchableOpacity
              key={mode.id}
              onPress={() => setSelectedMode(mode.id)}
              style={[
                styles.modeCard,
                {
                  backgroundColor: theme.card,
                  borderColor: selected ? mode.accent : theme.border,
                  borderWidth: selected ? 2 : 1,
                },
              ]}>
              <View style={[styles.badge, { backgroundColor: mode.accentBg, borderColor: mode.accent + '40' }]}>
                <Text style={[styles.badgeText, { color: mode.accent }]}>{mode.badge}</Text>
              </View>

              <View style={styles.modeContent}>
                <Text style={[styles.modeTitle, { color: selected ? mode.accent : theme.text }]}>{mode.title}</Text>
                <Text style={[styles.modeDesc, { color: theme.subtext }]}>{mode.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[
            styles.continueBtn,
            {
              backgroundColor: selectedMode ? theme.accentA : theme.card,
              borderColor: selectedMode ? theme.accentA : theme.border,
            },
          ]}
          onPress={handleContinue}>
          <Text style={[styles.continueBtnText, { color: selectedMode ? theme.bg : theme.subtext }]}>
            {selectedMode ? t.continueBtn : t.selectMode}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  team: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 8,
    marginBottom: 12,
  },
  welcome: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  modeCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  badge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  modeDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  continueBtn: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1.5,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
