import { Platform, StyleSheet, Text, View } from 'react-native';
import { BACKEND_URL, BACKEND_URL_CANDIDATES, HAS_BACKEND_URL } from '../config';
import { WEB_MODE_A_HTML } from '../webModeAHtml';

const frameStyle = {
  display: 'block',
  width: '100%',
  height: '100%',
  border: '0',
  backgroundColor: '#07070F',
};

export default function ModeAWebScreen() {
  if (Platform.OS !== 'web') {
    return null;
  }

  const frameHtml = WEB_MODE_A_HTML
    .replace('__BACKEND_URL__', BACKEND_URL || '')
    .replace('__BACKEND_URL_CANDIDATES__', JSON.stringify(BACKEND_URL_CANDIDATES));

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

      <View style={styles.frameWrap}>
        <iframe
          title="ISL Bridge Mode A"
          srcDoc={frameHtml}
          style={frameStyle}
          allow="camera; microphone; autoplay"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
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
  frameWrap: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
});
