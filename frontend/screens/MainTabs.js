import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, Text } from 'react-native';
import { useContext } from 'react';
import { AppContext } from '../AppContext';
import ModeAScreen from './ModeAScreen';
import ModeAWebScreen from './ModeAWebScreen';
import ModeBScreen from './ModeBScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  ModeA: 'A',
  ModeB: 'B',
};

export default function MainTabs({ route }) {
  const { theme } = useContext(AppContext);
  const initialTab = route.params?.screen === 'ModeB' ? 'ModeB' : 'ModeA';
  const ModeAComponent = Platform.OS === 'web' ? ModeAWebScreen : ModeAScreen;

  return (
    <Tab.Navigator
      initialRouteName={initialTab}
      screenOptions={({ route: currentRoute }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => (
          <Text style={{ fontSize: focused ? 28 : 24, color, marginTop: 5 }}>{ICONS[currentRoute.name]}</Text>
        ),
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          height: 65,
          paddingBottom: 8,
          paddingTop: 5,
        },
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarLabelStyle: {
          fontWeight: 'bold',
          fontSize: 11,
        },
      })}>
      <Tab.Screen name="ModeA" component={ModeAComponent} options={{ title: 'Sign to Speech' }} />
      <Tab.Screen name="ModeB" component={ModeBScreen} options={{ title: 'Speech to Text' }} />
    </Tab.Navigator>
  );
}
