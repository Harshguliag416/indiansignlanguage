import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Camera, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';

const LANG = {
  en: {
    title:        'App Permissions',
    subtitle:     'ISL Bridge needs these to work properly',
    cameraTitle:  'Camera',
    cameraDesc:   'Required for Mode A — detecting hand signs in real time',
    micTitle:     'Microphone',
    micDesc:      'Required for Mode B — converting your speech to text',
    speakerTitle: 'Speaker',
    speakerDesc:  'Required for Mode A — speaking translated signs aloud',
    allow:        'Allow',
    allowed:      '✓ Allowed',
    denied:       '✗ Denied',
    continueBtn:  'Continue to App',
    skip:         'Skip for now',
    allDone:      'All permissions granted!',
  },
  hi: {
    title:        'ऐप अनुमतियाँ',
    subtitle:     'ISL Bridge को सही काम करने के लिए ये चाहिए',
    cameraTitle:  'कैमरा',
    cameraDesc:   'मोड A के लिए जरूरी — रियल टाइम में हाथ के संकेत पहचानने के लिए',
    micTitle:     'माइक्रोफोन',
    micDesc:      'मोड B के लिए जरूरी — आपकी आवाज़ को टेक्स्ट में बदलने के लिए',
    speakerTitle: 'स्पीकर',
    speakerDesc:  'मोड A के लिए जरूरी — अनुवादित संकेत ज़ोर से बोलने के लिए',
    allow:        'अनुमति दें',
    allowed:      '✓ मिली',
    denied:       '✗ नहीं मिली',
    continueBtn:  'ऐप में जाएं',
    skip:         'अभी छोड़ें',
    allDone:      'सभी अनुमतियाँ मिल गईं!',
  },
};

export default function PermissionScreen({
  navigation,
  route,
  theme,
  lang,
  isDark,
  setIsDark,
  setLang,
}) {
  const { targetScreen, mode } = route.params;
  const t = LANG[lang];

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micGranted,    setMicGranted]    = useState(false);
  const [speakerGranted, setSpeakerGranted] = useState(false);

  const requestMic = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    setMicGranted(granted);
  };

  const requestSpeaker = async () => {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    setSpeakerGranted(true);
  };

  const handleContinue = () => {
    navigation.navigate(targetScreen, { mode });
  };

  const permissions = [
    {
      id: 'camera',
      icon: '📷',
      title: t.cameraTitle,
      desc: t.cameraDesc,
      granted: cameraPermission?.granted,
      onRequest: requestCameraPermission,
      accent: theme.accentA,
      needed: mode === 'A' || mode === 'BOTH',
    },
    {
      id: 'mic',
      icon: '🎤',
      title: t.micTitle,
      desc: t.micDesc,
      granted: micGranted,
      onRequest: requestMic,
      accent: theme.accentB,
      needed: mode === 'B' || mode === 'BOTH',
    },
    {
      id: 'speaker',
      icon: '🔊',
      title: t.speakerTitle,
      desc: t.speakerDesc,
      granted: speakerGranted,
      onRequest: requestSpeaker,
      accent: theme.accentA,
      needed: mode === 'A' || mode === 'BOTH',
    },
  ];

  const neededPermissions  = permissions.filter(p => p.needed);
  const allGranted = neededPermissions.every(p => p.granted);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>

      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: theme.accentA }]}>← Back</Text>
        </TouchableOpacity>
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

      <View style={styles.content}>

        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.headerIcon}>🔐</Text>
          <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>{t.subtitle}</Text>
        </View>

        {/* Permission cards */}
        {neededPermissions.map(perm => (
          <View
            key={perm.id}
            style={[
              styles.permCard,
              {
                backgroundColor: theme.card,
                borderColor: perm.granted ? perm.accent : theme.border,
                borderWidth: perm.granted ? 1.5 : 1,
              },
            ]}>

            <View style={[styles.permIcon, { backgroundColor: perm.accent + '20', borderColor: perm.accent + '40' }]}>
              <Text style={styles.permIconText}>{perm.icon}</Text>
            </View>

            <View style={styles.permContent}>
              <Text style={[styles.permTitle, { color: theme.text }]}>{perm.title}</Text>
              <Text style={[styles.permDesc, { color: theme.subtext }]}>{perm.desc}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.permBtn,
                {
                  backgroundColor: perm.granted ? perm.accent + '20' : perm.accent,
                  borderColor: perm.accent,
                },
              ]}
              onPress={perm.onRequest}
              disabled={perm.granted}>
              <Text style={[
                styles.permBtnText,
                { color: perm.granted ? perm.accent : '#FFFFFF' },
              ]}>
                {perm.granted ? t.allowed : t.allow}
              </Text>
            </TouchableOpacity>

          </View>
        ))}

        {/* All granted message */}
        {allGranted && (
          <View style={[styles.allGranted, { backgroundColor: theme.accentABg, borderColor: theme.accentA + '40' }]}>
            <Text style={[styles.allGrantedText, { color: theme.accentA }]}>
              ✅  {t.allDone}
            </Text>
          </View>
        )}

        {/* Continue button */}
        <TouchableOpacity
          style={[
            styles.continueBtn,
            {
              backgroundColor: allGranted ? theme.accentA : theme.card,
              borderColor: allGranted ? theme.accentA : theme.border,
            },
          ]}
          onPress={handleContinue}>
          <Text style={[
            styles.continueBtnText,
            { color: allGranted ? theme.bg : theme.subtext },
          ]}>
            {t.continueBtn}
          </Text>
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity onPress={handleContinue}>
          <Text style={[styles.skip, { color: theme.muted }]}>{t.skip}</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1 },
  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn:          { fontSize: 14, fontWeight: 'bold' },
  topBtns:          { flexDirection: 'row', gap: 8 },
  topBtn:           { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topBtnText:       { fontSize: 13, fontWeight: 'bold' },
  content:          { flex: 1, padding: 16, gap: 14 },
  headerCard:       { borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, gap: 6 },
  headerIcon:       { fontSize: 36 },
  title:            { fontSize: 22, fontWeight: 'bold' },
  subtitle:         { fontSize: 13, textAlign: 'center' },
  permCard:         { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  permIcon:         { width: 50, height: 50, borderRadius: 25, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  permIconText:     { fontSize: 22 },
  permContent:      { flex: 1 },
  permTitle:        { fontSize: 14, fontWeight: 'bold', marginBottom: 3 },
  permDesc:         { fontSize: 11, lineHeight: 16 },
  permBtn:          { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  permBtnText:      { fontSize: 12, fontWeight: 'bold' },
  allGranted:       { borderRadius: 10, padding: 12, borderWidth: 1, alignItems: 'center' },
  allGrantedText:   { fontSize: 13, fontWeight: 'bold' },
  continueBtn:      { borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1.5 },
  continueBtnText:  { fontSize: 15, fontWeight: 'bold' },
  skip:             { textAlign: 'center', fontSize: 12, marginTop: 4 },
});