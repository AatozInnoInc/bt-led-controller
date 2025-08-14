import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Platform, Text } from 'react-native';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DeviceDiscoveryScreen from './src/screens/DeviceDiscoveryScreen';
import CreateProfileScreen from './src/screens/CreateProfileScreen';

// Import theme
import { theme } from './src/utils/theme';

// Import custom tab bar
import CustomTabBar from './src/components/CustomTabBar';

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
          headerStyle: {
            backgroundColor: theme.dark.surface,
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
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <NavigationContainer theme={{
        dark: true,
        colors: {
          primary: theme.dark.primary,
          background: theme.dark.background,
          card: theme.dark.surface,
          text: theme.dark.text,
          border: theme.dark.border,
          notification: theme.dark.error,
        },
      }}>
        <Stack.Navigator>
          <Stack.Screen 
            name="Main" 
            component={TabNavigator} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="DeviceDiscovery" 
            component={DeviceDiscoveryScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="CreateProfile" 
            component={CreateProfileScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.dark.background,
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
