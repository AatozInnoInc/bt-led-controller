import React from 'react';
import { View, ViewStyle, Platform, StyleSheet } from 'react-native';

// Only import react-native-linear-gradient on native platforms
let LinearGradientNative: any = null;
if (Platform.OS !== 'web') {
  try {
    LinearGradientNative = require('react-native-linear-gradient').default;
  } catch (error) {
    console.warn('react-native-linear-gradient not available:', error);
  }
}

interface LinearGradientProps {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle;
  children?: React.ReactNode;
}

// Create a proper gradient component that works across platforms
const LinearGradientComponent: React.FC<LinearGradientProps> = ({ 
  colors, 
  start = { x: 0, y: 0 }, 
  end = { x: 1, y: 1 }, 
  style, 
  children 
}) => {
  // Use react-native-linear-gradient on native platforms
  if (Platform.OS !== 'web' && LinearGradientNative) {
    return (
      <LinearGradientNative
        colors={colors}
        start={start}
        end={end}
        style={style}
      >
        {children}
      </LinearGradientNative>
    );
  }
  
  // For web, use CSS gradients
  if (Platform.OS === 'web') {
    const gradientDirection = start.x === 0 && start.y === 0 && end.x === 1 && end.y === 1 
      ? 'to bottom right' 
      : start.x === 0 && start.y === 0 && end.x === 0 && end.y === 1
      ? 'to bottom'
      : start.x === 0 && start.y === 0 && end.x === 1 && end.y === 0
      ? 'to right'
      : 'to bottom right';
    
    const gradientColors = colors.join(', ');
    const webStyle = {
      ...style,
      background: `linear-gradient(${gradientDirection}, ${gradientColors})`,
    };
    
    return (
      <View style={webStyle}>
        {children}
      </View>
    );
  }
  
  // Fallback for native platforms without react-native-linear-gradient
  const backgroundColor = colors[0] || '#007AFF';
  return (
    <View style={[style, { backgroundColor }]}>
      {children}
    </View>
  );
};

export const LinearGradient = LinearGradientComponent;
