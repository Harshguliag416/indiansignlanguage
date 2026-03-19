import { useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { AppContext } from '../AppContext';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const { theme } = useContext(AppContext);
  const logoAnim = useRef(new Animated.Value(0)).current;
  const teamAnim = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]),
      Animated.timing(teamAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(taglineAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2500);

    return () => clearTimeout(timer);
  }, [logoAnim, navigation, scaleAnim, taglineAnim, teamAnim]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}> 
      <View style={[styles.glow, { backgroundColor: theme.accentA + '15' }]} />

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
        <Text style={[styles.logoText, { color: theme.accentA }]}>ISL</Text>
        <Text style={[styles.logoSub, { color: theme.text }]}>Bridge</Text>
      </Animated.View>

      <Animated.View style={{ opacity: teamAnim, alignItems: 'center' }}>
        <View style={[styles.teamBadge, { borderColor: theme.accentA, backgroundColor: theme.card }]}>
          <Text style={[styles.teamText, { color: theme.accentA }]}>TEAM ALPHA</Text>
        </View>
      </Animated.View>

      <Animated.Text style={[styles.tagline, { color: theme.subtext, opacity: taglineAnim }]}>
        Smart communication for deaf and hearing users.
      </Animated.Text>

      <Text style={[styles.credit, { color: theme.muted }]}>Built by Team ALPHA</Text>
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
    gap: 6,
    shadowColor: '#00F5D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  logoSub: {
    fontSize: 16,
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
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.5,
    paddingHorizontal: 24,
  },
  credit: {
    position: 'absolute',
    bottom: 40,
    fontSize: 11,
    letterSpacing: 1,
  },
});
