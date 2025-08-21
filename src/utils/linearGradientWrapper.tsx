import React from 'react';
import { View, ViewStyle, Platform, StyleSheet } from 'react-native';

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
  
      // For mobile platforms, slightly lighten dark gradients for better visibility
    const createVisibleGradient = (colorArray: string[]) => {
      const firstColor = colorArray[0] || '#007AFF';
      
      // Handle rgba colors
      if (firstColor.startsWith('rgba')) {
        const match = firstColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
        if (match) {
          const [, r, g, b, a] = match;
          const opacity = parseFloat(a);
          
          // Fix very transparent colors
          if (opacity < 0.05) {
            return `rgb(30, 30, 40)`;
          }
          
          // Otherwise preserve but make opaque
          return `rgb(${r}, ${g}, ${b})`;
        }
      }
      
      // Handle hex colors - slightly brighten very dark ones
      if (firstColor.startsWith('#')) {
        const hex = firstColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = (r + g + b) / 3;
        
        // If very dark (brightness < 20), add 15 to each RGB component for very subtle lightening
        if (brightness < 20) {
          const newR = Math.min(255, r + 15);
          const newG = Math.min(255, g + 15);
          const newB = Math.min(255, b + 15);
          return `rgb(${newR}, ${newG}, ${newB})`;
        }
      }
      
      // Preserve all other colors as-is
      return firstColor;
    };
  
  const backgroundColor = createVisibleGradient(colors);
  
  // Debug logging
  console.log('iOS gradient colors:', colors, '-> using:', backgroundColor);
  
      const mobileStyle: ViewStyle = {
      ...style,
      backgroundColor: backgroundColor,
    };
  
  // For mobile, create a layered effect to simulate gradient
  const firstColor = createVisibleGradient([colors[0]]);
  const secondColor = colors[1] ? createVisibleGradient([colors[1]]) : firstColor;
  
  return (
    <View style={mobileStyle}>
      {/* Second color overlay to create some gradient effect */}
      {colors.length > 1 && (
        <View style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: secondColor,
          opacity: 0.3,
        }} />
      )}
      <View style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </View>
    </View>
  );
};

export const LinearGradient = LinearGradientComponent;
