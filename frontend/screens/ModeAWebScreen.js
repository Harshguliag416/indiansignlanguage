import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BACKEND_URL, HAS_BACKEND_URL } from '../config';
import { WEB_MODE_A_HTML } from '../webModeAHtml';

export default function ModeAWebScreen() {
  const srcDoc = useMemo(() => WEB_MODE_A_HTML.replace('__BACKEND_URL__', BACKEND_URL || ''), []);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.root}>
      {!HAS_BACKEND_URL && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Render backend URL missing</Text>
          <Text style={styles.bannerText}>
            Set the Vercel environment variable EXPO_PUBLIC_BACKEND_URL to your Render backend URL,
            then redeploy the frontend.
          </Text>
        </View>
      )}
      <iframe
        title="ISL Bridge Mode A"
        srcDoc={srcDoc}
        style={styles.frame}
        allow="camera; microphone; autoplay"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07070F',
  },
  banner: {
    backgroundColor: '#1A0A12',
    borderBottomColor: '#F72585',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerTitle: {
    color: '#F72585',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerText: {
    color: '#F6D6E3',
    fontSize: 12,
    lineHeight: 18,
  },
  frame: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: '#07070F',
  },
});
