import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle, Platform } from 'react-native';
import { LinearGradient } from '../utils/linearGradientWrapper';
import { Ionicons } from '@expo/vector-icons';

type GradientButtonProps = {
  text: string;
  onPress: () => void;
  colors: string[];
  glossColors?: string[];
  shadeColors?: string[];
  iconName?: string;
  iconColor?: string;
  iconSize?: number;
  iconBackgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
};

const GradientButton: React.FC<GradientButtonProps> = ({
  text,
  onPress,
  colors,
  glossColors = ['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.00)'],
  shadeColors = ['rgba(0,0,0,0.00)', 'rgba(0,0,0,0.18)'],
  iconName,
  iconColor = '#FFFFFF',
  iconSize = 22,
  iconBackgroundColor = 'rgba(255,255,255,0.22)',
  style,
  contentStyle,
  textStyle,
  disabled,
}) => {
  return (
    <TouchableOpacity style={[styles.button, style, disabled && { opacity: 0.6 }]} onPress={onPress} disabled={disabled} activeOpacity={0.8}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject as any} />
      {glossColors && (
        <LinearGradient colors={glossColors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFillObject as any} />
      )}
      {/* Subtle bottom shade for depth */}
      <LinearGradient colors={shadeColors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFillObject as any} />
      {/* Hairline highlight border */}
      <View pointerEvents="none" style={styles.borderOverlay} />
      <View style={[styles.content, contentStyle]}>
        {iconName ? (
          <View style={[styles.iconContainer, { backgroundColor: iconBackgroundColor }]}> 
            <Ionicons name={iconName as any} size={iconSize} color={iconColor} />
          </View>
        ) : null}
        <Text style={[styles.text, textStyle]}>{text}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'relative',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 28,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 14px 36px rgba(0,0,0,0.35)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 24,
      elevation: 16,
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 6px 14px rgba(255,255,255,0.25)'
    } : {
      shadowColor: '#FFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    }),
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)'
  },
});

export default GradientButton;


