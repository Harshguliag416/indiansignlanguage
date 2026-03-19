import { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { useSpeechRecognitionPermissions } from 'expo-speech-recognition';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppContext } from '../AppContext';

const LANG = {
  en: {
    title: 'Required Permissions',
    subtitle: 'We will only ask for permissions needed for your selected role.',
    cameraTitle: 'Camera',
    cameraDesc: 'Needed for sign-to-speech mode.',
    micTitle: 'Microphone',
    micDesc: 'Needed for speech-to-text mode.',
    speakerTitle: 'Speaker',
    speakerDesc: 'Needed when signs are spoken aloud.',
    allow: 'Allow',
    allowed: 'Allowed',
    continueBtn: 'Open App',
    skip: 'Skip for now',
    allDone: 'Required permissions are ready.',
    browserManaged: 'On web, your browser will ask for access when the feature starts.',
  },
  hi: {
    title: 'Zaroori Permissions',
    subtitle: 'Sirf wahi permissions maangi jayengi jo aapke role ke liye chahiye.',
    cameraTitle: 'Camera',
    cameraDesc: 'Sign-to-speech mode ke liye chahiye.',
    micTitle: 'Microphone',
    micDesc: 'Speech-to-text mode ke liye chahiye.',
    speakerTitle: 'Speaker',
    speakerDesc: 'Jab signs ko bolkar sunaya jayega tab chahiye.',
    allow: 'Allow',
    allowed: 'Allowed',
    continueBtn: 'App kholen',
    skip: 'Abhi skip karein',
    allDone: 'Zaroori permissions tayyar hain.',
    browserManaged: 'Web par browser feature chalne par access maangega.',
  },
};

export default function PermissionScreen({ navigation, route }) {
  const { targetScreen, mode, initialTab } = route.params;
  const { theme, lang, isDark } = useContext(AppContext);
  const t = LANG[lang];
  const isWeb = Platform.OS === 'web';

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useSpeechRecognitionPermissions();
  const [speakerGranted, setSpeakerGranted] = useState(isWeb);

  const permissions = [
    {
      id: 'camera',
      label: 'CAM',
      title: t.cameraTitle,
      desc: t.cameraDesc,
      granted: isWeb ? true : cameraPermission?.granted,
      onRequest: isWeb ? (() => {}) : requestCameraPermission,
      accent: theme.accentA,
      needed: mode === 'A' || mode === 'BOTH',
    },
    {
      id: 'mic',
      label: 'MIC',
      title: t.micTitle,
      desc: t.micDesc,
      granted: isWeb ? true : micPermission?.granted,
      onRequest: isWeb ? (() => {}) : requestMicPermission,
      accent: theme.accentB,
      needed: mode === 'B' || mode === 'BOTH',
    },
    {
      id: 'speaker',
      label: 'SPK',
      title: t.speakerTitle,
      desc: t.speakerDesc,
      granted: speakerGranted,
      onRequest: () => setSpeakerGranted(true),
      accent: theme.accentA,
      needed: mode === 'A' || mode === 'BOTH',
    },
  ];

  const neededPermissions = permissions.filter((permission) => permission.needed);
  const allGranted = neededPermissions.every((permission) => permission.granted);

  const handleContinue = async () => {
    try {
      const settings = { lang, isDark, mode, initialTab };
      await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
      navigation.reset({
        index: 0,
        routes: [{ name: targetScreen, params: { screen: initialTab } }],
      });
    } catch (error) {
      console.error('Failed to save user settings', error);
      navigation.navigate(targetScreen, { screen: initialTab });
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}> 
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
        <Text style={[styles.subtitle, { color: theme.subtext }]}>{t.subtitle}</Text>
        {isWeb && <Text style={[styles.webHint, { color: theme.accentA }]}>{t.browserManaged}</Text>}

        {neededPermissions.map((permission) => (
          <View
            key={permission.id}
            style={[
              styles.permissionCard,
              {
                backgroundColor: theme.card,
                borderColor: permission.granted ? permission.accent : theme.border,
                borderWidth: permission.granted ? 1.5 : 1,
              },
            ]}>
            <View style={[styles.permissionBadge, { backgroundColor: permission.accent + '20', borderColor: permission.accent + '40' }]}>
              <Text style={[styles.permissionBadgeText, { color: permission.accent }]}>{permission.label}</Text>
            </View>
            <View style={styles.permissionContent}>
              <Text style={[styles.permissionTitle, { color: theme.text }]}>{permission.title}</Text>
              <Text style={[styles.permissionDesc, { color: theme.subtext }]}>{permission.desc}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.permissionButton,
                {
                  backgroundColor: permission.granted ? permission.accent + '20' : permission.accent,
                  borderColor: permission.accent,
                },
              ]}
              onPress={permission.onRequest}
              disabled={permission.granted}>
              <Text style={[styles.permissionButtonText, { color: permission.granted ? permission.accent : '#FFFFFF' }]}>
                {permission.granted ? t.allowed : t.allow}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {allGranted && (
          <View style={[styles.allDone, { backgroundColor: theme.accentABg, borderColor: theme.accentA + '40' }]}>
            <Text style={[styles.allDoneText, { color: theme.accentA }]}>{t.allDone}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.continueBtn,
          {
            backgroundColor: allGranted ? theme.accentA : theme.card,
            borderColor: allGranted ? theme.accentA : theme.border,
          },
        ]}
        onPress={handleContinue}
        disabled={!allGranted}>
        <Text style={[styles.continueBtnText, { color: allGranted ? theme.bg : theme.subtext }]}>{t.continueBtn}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate(targetScreen, { screen: initialTab })}>
        <Text style={[styles.skip, { color: theme.muted }]}>{t.skip}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20 },
  content: { flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 8, marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 22, marginBottom: 10 },
  webHint: { fontSize: 12, lineHeight: 18, marginBottom: 20, fontWeight: '600' },
  permissionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permissionBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBadgeText: { fontSize: 12, fontWeight: 'bold' },
  permissionContent: { flex: 1 },
  permissionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  permissionDesc: { fontSize: 12, lineHeight: 18 },
  permissionButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  permissionButtonText: { fontSize: 12, fontWeight: 'bold' },
  allDone: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  allDoneText: { fontSize: 13, fontWeight: 'bold' },
  continueBtn: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  continueBtnText: { fontSize: 15, fontWeight: 'bold' },
  skip: { textAlign: 'center', marginTop: 14, fontSize: 12 },
});
