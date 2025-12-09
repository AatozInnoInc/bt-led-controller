import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Platform, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DeviceDiscoveryScreen from './src/screens/DeviceDiscoveryScreen';
import CreateProfileScreen from './src/screens/CreateProfileScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';

// Import theme
import { theme } from './src/utils/theme';

// Import custom tab bar
import CustomTabBar from './src/components/CustomTabBar';
import SignInScreen from './src/screens/SignInScreen';
import { ThemeProvider } from './src/contexts/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator() {
  return (
    <>
      {Platform.OS === 'web' && (
        <View style={styles.webHeader}>
          <Text style={styles.webHeaderTitle}>BT LED Guitar Dashboard</Text>
        </View>
      )}
      <Tab.Navigator
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: Platform.OS !== 'web',
          headerTransparent: true,
          headerBackground: () => (
            <BlurView intensity={30} tint="dark" style={{ flex: 1 }} />
          ),
          headerStyle: {
            backgroundColor: 'transparent',
            borderBottomColor: theme.dark.border,
            borderBottomWidth: 0.5,
          },
          headerTintColor: theme.dark.text,
        }}
      >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Config" 
        component={ConfigScreen}
        options={{ title: 'LED Control' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
          </Tab.Navigator>
    </>
  );
}

export default function App() {
  const [isSignedIn, setIsSignedIn] = React.useState(false);

  return (
    <ThemeProvider>
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        {Platform.OS === 'ios' && !isSignedIn ? (
          <SignInScreen onSignedIn={() => setIsSignedIn(true)} />
        ) : (
        <NavigationContainer theme={{
          dark: true,
          colors: {
            primary: theme.dark.primary,
            background: 'transparent',
            card: theme.dark.surface,
            text: theme.dark.text,
            border: theme.dark.border,
            notification: theme.dark.error,
          },
        }}>
          <Stack.Navigator screenOptions={{ headerBackTitleVisible: false }}>
            <Stack.Screen 
              name="Main" 
              component={TabNavigator} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="DeviceDiscovery" 
              component={DeviceDiscoveryScreen as any}
              options={{ 
                headerShown: Platform.OS !== 'web',
                presentation: Platform.OS === 'ios' ? 'modal' : 'card',
                headerTransparent: true,
                headerBackground: () => (
                  <BlurView intensity={30} tint="dark" style={{ flex: 1 }} />
                ),
                headerTitle: 'Device Discovery',
                headerTintColor: theme.dark.text,
              }}
            />
            <Stack.Screen 
              name="CreateProfile" 
              component={CreateProfileScreen as any}
              options={{ 
                headerShown: Platform.OS !== 'web',
                presentation: Platform.OS === 'ios' ? 'modal' : 'card',
                headerTransparent: true,
                headerBackground: () => (
                  <BlurView intensity={30} tint="dark" style={{ flex: 1 }} />
                ),
                headerTitle: 'Create Profile',
                headerTintColor: theme.dark.text,
              }}
            />
            <Stack.Screen 
              name="Analytics" 
              component={AnalyticsScreen as any}
              options={{ 
                headerShown: Platform.OS !== 'web',
                presentation: Platform.OS === 'ios' ? 'modal' : 'card',
                headerTransparent: true,
                headerBackground: () => (
                  <BlurView intensity={30} tint="dark" style={{ flex: 1 }} />
                ),
                headerTitle: 'Analytics',
                headerTintColor: theme.dark.text,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        )}
      </View>
    </SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a', // Set a dark default background
  },

  webHeader: {
    backgroundColor: theme.dark.surface,
    paddingTop: Platform.OS === 'web' ? 20 : 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.dark.border,
  },
  webHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.dark.text,
    textAlign: 'center',
  },
});
