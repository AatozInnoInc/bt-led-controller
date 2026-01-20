import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
}

const Toast: React.FC<ToastProps> = ({ 
  visible, 
  message, 
  type = 'info',
  duration = 2000,
  onHide 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wasVisibleRef = useRef(false);
  const onHideRef = useRef(onHide);

  // Keep ref in sync with latest onHide callback
  useEffect(() => {
    console.log('[Toast] onHide callback changed, updating ref');
    onHideRef.current = onHide;
  }, [onHide]);

  const hideToast = useCallback(() => {
    console.log('[Toast] hideToast called');
    if (hideTimerRef.current) {
      console.log('[Toast] Clearing existing timer');
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    console.log('[Toast] Starting hide animation');
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      console.log('[Toast] Hide animation completed, calling onHide');
      if (onHideRef.current) {
        onHideRef.current();
      } else {
        console.log('[Toast] WARNING: onHideRef.current is null/undefined');
      }
    });
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    console.log('[Toast] useEffect triggered', {
      visible,
      type,
      duration,
      message: message.substring(0, 30),
      wasVisible: wasVisibleRef.current,
      hasTimer: !!hideTimerRef.current,
    });

    // Always clear any existing timer first
    if (hideTimerRef.current) {
      console.log('[Toast] Clearing existing timer in useEffect');
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (visible) {
      // Only animate if transitioning from not visible to visible
      if (!wasVisibleRef.current) {
        console.log('[Toast] Showing toast - starting animation');
        // Show animation - fade in and scale up
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();
      }

      // Auto-hide after duration (unless it's loading type)
      // Always reset timer when type changes (e.g., from loading to success)
      if (type !== 'loading' && duration > 0) {
        console.log(`[Toast] Setting auto-hide timer for ${duration}ms (type: ${type})`);
        hideTimerRef.current = setTimeout(() => {
          console.log('[Toast] Timer fired - calling hideToast');
          hideToast();
        }, duration);
      } else {
        console.log(`[Toast] NOT setting timer - type: ${type}, duration: ${duration}`);
      }      
      wasVisibleRef.current = true;
    } else if (wasVisibleRef.current) {
      console.log('[Toast] Toast becoming invisible - calling hideToast');
      // Only hide if it was previously visible (transitioning from visible to hidden)
      hideToast();
      wasVisibleRef.current = false;
    }

    return () => {
      if (hideTimerRef.current) {
        console.log('[Toast] Cleanup: clearing timer');
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [visible, type, duration, message, hideToast]);

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'loading':
        return 'bluetooth';
      default:
        return 'information-circle';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#34C759'; // iOS green
      case 'error':
        return '#FF3B30'; // iOS red
      case 'loading':
        return '#007AFF'; // iOS blue
      default:
        return '#007AFF';
    }
  };

  const iconColor = getIconColor();

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.toastContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <BlurView 
          intensity={20} 
          tint="light" 
          style={styles.toast}
        >
          <View style={styles.content}>
            {type === 'loading' ? (
              <ActivityIndicator size="large" color={iconColor} style={styles.icon} />
            ) : (
              <Ionicons 
                name={getIcon() as any} 
                size={48} 
                color={iconColor}
                style={styles.icon}
              />
            )}
            <Text style={styles.message}>{message}</Text>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  toastContainer: {
    width: 200,
    minHeight: 160,
  },
  toast: {
    borderRadius: 16,
    backgroundColor: 'rgba(186, 186, 186, 0.86)', // More transparent iOS light gray
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 32px rgba(13, 13, 14, 0.13)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 20,
    }),
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  icon: {
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    fontWeight: '400',
    color: '#1C1C1E', // iOS dark gray text
    textAlign: 'center',
    letterSpacing: -0.2,
  },
});

export default Toast;
