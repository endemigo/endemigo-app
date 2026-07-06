import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { styles } from './SectionErrorCard.styles';

interface Props {
  message?: string;
  onRetry: () => void;
  style?: object;
}

export function SectionErrorCard({ message, onRetry, style }: Props) {
  const { t } = useTranslation();

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="cloud-offline-outline" size={20} color={Colors.error} />
      <Text style={styles.message} numberOfLines={2}>
        {message ?? t('common.sectionLoadError')}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        activeOpacity={0.8}
        onPress={onRetry}
        accessibilityRole="button"
      >
        <Text style={styles.retryText}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}
