import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const CustomTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 3000,
          useNativeDriver: false,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(25,25,30,0.95)', 'rgba(35,35,40,0.95)', 'rgba(25,25,30,0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.02)', 'transparent', 'rgba(255,255,255,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View 
        style={[
          styles.glowEffect,
          { opacity: glowOpacity }
        ]} 
      />
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={styles.tabBarContent}>
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
                 color={isFocused ? '#FFFFFF' : theme.dark.textSecondary}
               />
               <Text style={[
                 styles.label,
                 { color: isFocused ? '#FFFFFF' : theme.dark.textSecondary }
               ]}>
                {label}
              </Text>
            </View>
          </TouchableOpacity>
                 );
       })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderTopColor: theme.dark.border,
    borderTopWidth: 0.5,
    height: Platform.OS === 'ios' ? 78 : 68,
    marginHorizontal: 12,
    marginBottom: Platform.OS === 'web' ? 0 : 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { borderRadius: 0, marginHorizontal: 0 } : null),
  },
  tabBarContent: {
    flexDirection: 'row',
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 14 : 10,
    paddingTop: 10,
  },
  glowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    ...(Platform.OS === 'web' ? { borderRadius: 0 } : null),
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
    position: 'relative',
  },
  activePill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 20px rgba(255,255,255,0.2)',
    } : {
      shadowColor: '#FFFFFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 5,
    }),
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default CustomTabBar;
