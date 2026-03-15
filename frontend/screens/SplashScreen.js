import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation, theme }) {
  const logoAnim    = useRef(new Animated.Value(0)).current;
  const teamAnim    = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // sequence: logo fades+scales in → team name → tagline → navigate
    Animated.sequence([
      // logo appears
      Animated.parallel([
        Animated.timing(logoAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]),
      // team name appears
      Animated.timing(teamAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // tagline appears
      Animated.timing(taglineAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // hold for 1 second
      Animated.delay(1000),
    ]).start(() => {
      navigation.replace('Onboarding');
    });
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>

      {/* Background glow */}
      <View style={[styles.glow, { backgroundColor: theme.accentA + '15' }]} />

      {/* Logo circle */}
      <Animated.View
        style={[
          styles.logoCircle,
          {
            borderColor: theme.accentA,
            backgroundColor: theme.card,
            opacity: logoAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
        <Text style={styles.logoEmoji}>🤟</Text>
        <Text style={[styles.logoText, { color: theme.accentA }]}>ISL</Text>
        <Text style={[styles.logoSub, { color: theme.text }]}>Bridge</Text>
      </Animated.View>

      {/* Team name */}
      <Animated.View style={{ opacity: teamAnim, alignItems: 'center' }}>
        <View style={[styles.teamBadge, { borderColor: theme.accentA, backgroundColor: theme.card }]}>
          <Text style={[styles.teamText, { color: theme.accentA }]}>⚡ TEAM ALPHA</Text>
        </View>
      </Animated.View>

      {/* Tagline */}
      <Animated.Text
        style={[
          styles.tagline,
          { color: theme.subtext, opacity: taglineAnim },
        ]}>
        Every voice deserves to be heard.
      </Animated.Text>

      {/* Bottom credit */}
      <Text style={[styles.credit, { color: theme.muted }]}>
        KCCITM · B.Tech CSE · AKTU
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  glow: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    top: height * 0.15,
  },
  logoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#00F5D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  logoEmoji: {
    fontSize: 44,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  logoSub: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
  },
  teamBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  teamText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 13,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  credit: {
    position: 'absolute',
    bottom: 40,
    fontSize: 11,
    letterSpacing: 1,
  },
});