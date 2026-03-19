import { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SplashScreen    from './screens/SplashScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import PermissionScreen from './screens/PermissionScreen';
import LoginScreen from './screens/LoginScreen';
import MainTabs from './screens/MainTabs';
import { AppContext } from './AppContext';

const Stack = createNativeStackNavigator();

// ── Global Theme ───────────────────────────────────────────
export const THEME = {
  dark: {
    bg:          '#07070F',
    card:        '#0F0F1E',
    border:      '#1A1A3A',
    text:        '#FFFFFF',
    subtext:     '#44446A',
    muted:       '#2A2A4A',
    accentA:     '#00F5D4',
    accentB:     '#F72585',
    accentC:     '#B5179E',
    accentABg:   '#001A12',
    accentBBg:   '#1A0A12',
    accentCBg:   '#2A0F2A',
    placeholder: '#2A2A4A',
    header:      '#07070F',
    headerText:  '#FFFFFF',
    tabBar:      '#07070F',
    tabActive:   '#00F5D4',
    tabInactive: '#44446A',
  },
  light: {
    bg:          '#F0F4F8',
    card:        '#FFFFFF',
    border:      '#E0E0F0',
    text:        '#0A0A1A',
    subtext:     '#6666AA',
    muted:       '#AAAACC',
    accentA:     '#008B7A',
    accentB:     '#C2185B',
    accentC:     '#9C27B0',
    accentABg:   '#E0F5F2',
    accentBBg:   '#FCE4EC',
    accentCBg:   '#F3E5F5',
    placeholder: '#AAAACC',
    header:      '#FFFFFF',
    headerText:  '#0A0A1A',
    tabBar:      '#FFFFFF',
    tabActive:   '#008B7A',
    tabInactive: '#AAAACC',
  },
};

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [lang, setLang]     = useState('en');

  const theme = isDark ? THEME.dark : THEME.light;

  const sharedProps = {
    isDark,
    setIsDark,
    lang,
    setLang,
    theme,
  };

  return (
    <SafeAreaProvider>
      <AppContext.Provider value={sharedProps}>
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}>

          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Permission" component={PermissionScreen} />
          <Stack.Screen name="Main" component={MainTabs} />

      </Stack.Navigator>
    </NavigationContainer>
      </AppContext.Provider>
    </SafeAreaProvider>
  );
}