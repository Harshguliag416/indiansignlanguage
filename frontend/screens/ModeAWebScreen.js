import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BACKEND_URL, BACKEND_URL_CANDIDATES, HAS_BACKEND_URL } from '../config';
import { WEB_FONT_FAMILY } from '../design';
import { WEB_MODE_A_HTML } from '../webModeAHtml';

const frameStyle = {
  display: 'block',
  width: '100%',
  height: '100%',
  border: '0',
  backgroundColor: '#EFF6F8',
  borderRadius: '28px',
};

export default function ModeAWebScreen() {
  const isWeb = Platform.OS === 'web';
  const [frameUrl, setFrameUrl] = useState(null);

  const frameHtml = WEB_MODE_A_HTML
    .replace('__BACKEND_URL__', BACKEND_URL || '')
    .replace('__BACKEND_URL_CANDIDATES__', JSON.stringify(BACKEND_URL_CANDIDATES));

  useEffect(() => {
    if (!isWeb) {
      return undefined;
    }

    const blob = new Blob([frameHtml], { type: 'text/html' });
    const nextUrl = URL.createObjectURL(blob);
    setFrameUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [frameHtml, isWeb]);

  if (!isWeb) {
    return null;
  }

  return (
    <View style={styles.root}>
      {!HAS_BACKEND_URL && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Backend URL missing</Text>
          <Text style={styles.bannerText}>
            Set `EXPO_PUBLIC_BACKEND_URL` in Vercel so the live sign page can talk to Render.
          </Text>
        </View>
      )}

      <View style={styles.frameWrap}>
        <iframe
          title="ISL Bridge Mode A"
          src={frameUrl || undefined}
          style={frameStyle}
          allow="camera *; microphone *; autoplay *"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    gap: 14,
  },
  banner: {
    backgroundColor: '#FFF0E6',
    borderColor: '#F97316',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  bannerTitle: {
    color: '#C96318',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: WEB_FONT_FAMILY,
  },
  bannerText: {
    color: '#7B4D2A',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: WEB_FONT_FAMILY,
  },
  frameWrap: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    borderRadius: 28,
  },
});
