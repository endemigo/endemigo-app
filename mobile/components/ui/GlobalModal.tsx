import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { useModalStore } from '../../store/modalStore';
import { styles } from './GlobalModal.styles';

export function GlobalModal() {
  const { t } = useTranslation();
  const { isVisible, options, hideModal } = useModalStore();
  const [shouldRender, setShouldRender] = useState(isVisible);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;

    if (isVisible) {
      setShouldRender(true);
      opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    } else {
      opacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) });
      scale.value = withTiming(0.9, { duration: 200, easing: Easing.in(Easing.ease) });
      hideTimeout = setTimeout(() => setShouldRender(false), 200);
    }

    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [isVisible, opacity, scale]);

  const handleConfirm = () => {
    if (options.onConfirm) options.onConfirm();
    hideModal();
  };

  const handleCancel = () => {
    if (options.onCancel) options.onCancel();
    hideModal();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getIcon = () => {
    switch (options.type) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={48} color={Colors.auctionGreen} />;
      case 'error':
        return <Ionicons name="close-circle" size={48} color={Colors.error} />;
      case 'info':
      default:
        return <Ionicons name="information-circle" size={48} color={Colors.primary} />;
    }
  };

  if (!shouldRender) return null;

  return (
    <Animated.View style={[styles.overlay, animatedStyle]} pointerEvents={isVisible ? 'auto' : 'none'}>
      <Animated.View style={[styles.modalContent, animatedContentStyle]}>
        <View style={styles.iconContainer}>{getIcon()}</View>

        <Text style={styles.title}>{options.title}</Text>
        <Text style={styles.message}>{options.message}</Text>

        <View style={styles.buttonContainer}>
          {options.onCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>{options.cancelText ?? t('common.cancel')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.confirmBtn, options.type === 'error' && styles.errorBtn]}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmBtnText}>{options.confirmText ?? t('common.ok')}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
