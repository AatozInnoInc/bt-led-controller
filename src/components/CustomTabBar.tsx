import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const CustomTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  return (
    <BlurView intensity={30} tint="dark" style={styles.container}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
          }
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const getIconName = () => {
          switch (route.name) {
            case 'Home':
              return 'home';
            case 'Config':
              return 'settings';
            case 'Profile':
              return 'person';
            default:
              return 'home';
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            <View style={[styles.tabContent, isFocused && styles.activePill]}>
              <Ionicons
                name={getIconName() as any}
                size={22}
                color={isFocused ? theme.dark.primary : theme.dark.textSecondary}
              />
              <Text style={[
                styles.label,
                { color: isFocused ? theme.dark.primary : theme.dark.textSecondary }
              ]}>
                {label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.dark.surface,
    borderTopColor: theme.dark.border,
    borderTopWidth: 0.5,
    paddingBottom: Platform.OS === 'ios' ? 14 : 10,
    paddingTop: 10,
    height: Platform.OS === 'ios' ? 78 : 68,
    marginHorizontal: 12,
    marginBottom: Platform.OS === 'web' ? 0 : 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    ...(Platform.OS === 'web' ? { position: 'absolute' as const, bottom: 0, left: 0, right: 0, borderRadius: 0, marginHorizontal: 0 } : null),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activePill: {
    backgroundColor: '#007AFF22',
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default CustomTabBar;
