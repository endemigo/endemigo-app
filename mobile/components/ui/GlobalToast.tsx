import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { useToastStore } from '../../store/toastStore';
import { styles } from './GlobalToast.styles';

export function GlobalToast() {
  const insets = useSafeAreaInsets();
  const { isVisible, message, type, durationMs, token, hideToast } = useToastStore();
  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!isVisible) return;

    translateY.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });

    const timeout = setTimeout(() => {
      translateY.value = withTiming(-80, { duration: 220, easing: Easing.in(Easing.cubic) });
      opacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
      setTimeout(() => hideToast(), 220);
    }, durationMs);

    return () => clearTimeout(timeout);
  }, [durationMs, hideToast, isVisible, opacity, token, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!isVisible) return null;

  const iconName = type === 'success' ? 'checkmark-circle' : type === 'error' ? 'alert-circle' : 'information-circle';
  const typeStyle = type === 'success' ? styles.success : type === 'error' ? styles.error : styles.info;

  return (
    <View pointerEvents="none" style={[styles.wrapper, { paddingTop: insets.top + 8 }]}>
      <Animated.View style={[styles.toast, typeStyle, animatedStyle]}>
        <Ionicons name={iconName} size={20} color={Colors.white} />
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
}
