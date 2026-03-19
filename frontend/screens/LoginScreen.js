import { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { AppContext } from '../AppContext';

const COPY = {
  en: {
    eyebrow: 'TEAM ALPHA',
    title: 'Choose your preferred language',
    subtitle: 'We will use this language for the next questions and setup.',
    continue: 'Continue',
    choose: 'Select a language to continue',
  },
  hi: {
    eyebrow: 'TEAM ALPHA',
    title: 'Apni pasand ki bhasha chunen',
    subtitle: 'Agale sawaal aur setup isi bhasha mein dikhaye jayenge.',
    continue: 'Aage badhein',
    choose: 'Aage badhne ke liye bhasha chunen',
  },
};

const LANGUAGE_OPTIONS = [
  { id: 'en', title: 'English', subtitle: 'Use English across the app.' },
  { id: 'hi', title: 'Hindi', subtitle: 'App Hindi mein chalega.' },
];

export default function LoginScreen({ navigation }) {
  const { theme, setLang } = useContext(AppContext);
  const [selectedLang, setSelectedLang] = useState(null);
  const t = COPY[selectedLang || 'en'];

  const handleContinue = () => {
    if (!selectedLang) {
      return;
    }

    setLang(selectedLang);
    navigation.navigate('Onboarding');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}> 
      <View style={styles.content}>
        <Text style={[styles.eyebrow, { color: theme.accentA }]}>{t.eyebrow}</Text>
        <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
        <Text style={[styles.subtitle, { color: theme.subtext }]}>{t.subtitle}</Text>

        <View style={styles.options}>
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = selectedLang === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => setSelectedLang(option.id)}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: selected ? theme.accentA : theme.border,
                    borderWidth: selected ? 2 : 1,
                  },
                ]}>
                <Text style={[styles.optionTitle, { color: selected ? theme.accentA : theme.text }]}>{option.title}</Text>
                <Text style={[styles.optionSubtitle, { color: theme.subtext }]}>{option.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: selectedLang ? theme.accentA : theme.card,
            borderColor: selectedLang ? theme.accentA : theme.border,
          },
        ]}
        onPress={handleContinue}>
        <Text style={[styles.buttonText, { color: selectedLang ? theme.bg : theme.subtext }]}>
          {selectedLang ? t.continue : t.choose}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  options: {
    gap: 14,
  },
  optionCard: {
    borderRadius: 16,
    padding: 18,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  optionSubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  button: {
    margin: 24,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
