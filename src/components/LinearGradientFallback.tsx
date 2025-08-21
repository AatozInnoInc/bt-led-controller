import React from 'react';
import { View, ViewStyle } from 'react-native';

interface LinearGradientProps {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle;
  children?: React.ReactNode;
}

const LinearGradientFallback: React.FC<LinearGradientProps> = ({
  colors,
  style,
  children,
}) => {
  // Simple fallback that uses the first color
  const backgroundColor = colors[0] || '#000000';
  
  return (
    <View style={[{ backgroundColor }, style]}>
      {children}
    </View>
  );
};

export default LinearGradientFallback;
