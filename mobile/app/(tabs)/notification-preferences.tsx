import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../../hooks/useNotifications';
import { useModalStore } from '../../store/modalStore';
import type { NotificationPreferenceCategory, NotificationPreferenceItem } from '../../types/transactionFlows';
import { getApiErrorMessage } from '../../utils/transactionFormatters';
import { styles } from '../../styles/tabs/notification-preferences.styles';

const CATEGORIES: NotificationPreferenceCategory[] = ['order', 'cargo', 'auction', 'payment'];
const SWITCH_TRACK_COLOR = { false: Colors.slate300, true: Colors.primary };

export default function NotificationPreferencesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showModal } = useModalStore();
  const preferences = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const [categories, setCategories] = useState<NotificationPreferenceItem[]>([]);

  useEffect(() => {
    if (preferences.data?.categories) {
      setCategories(preferences.data.categories);
    }
  }, [preferences.data]);

  const categoryMap = useMemo(
    () => new Map(categories.map((item) => [item.category, item])),
    [categories],
  );

  const handleToggle = (category: NotificationPreferenceCategory) => {
    setCategories((current) =>
      current.map((item) =>
        item.category === category
          ? { ...item, inApp: !item.inApp, push: !item.inApp }
          : item,
      ),
    );
  };

  const handleSave = async () => {
    try {
      await updatePreferences.mutateAsync({ categories });
      showModal({
        title: t('notifications.preferencesSavedTitle'),
        message: t('notifications.preferencesSavedMessage'),
        type: 'success',
      });
    } catch (error) {
      showModal({
        title: t('notifications.preferencesErrorTitle'),
        message: getApiErrorMessage(error, t('common.genericError')),
        type: 'error',
      });
    }
  };

  if (preferences.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notifications.preferencesTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.card}>
        {CATEGORIES.map((category, index) => {
          const current = categoryMap.get(category);
          return (
            <React.Fragment key={category}>
              <View style={styles.preferenceRow}>
                <View style={styles.preferenceText}>
                  <Text style={styles.preferenceTitle}>{t(`notifications.${category}`)}</Text>
                  <Text style={styles.preferenceDescription}>{t('notifications.preferences')}</Text>
                </View>
                <Switch
                  value={current?.inApp ?? true}
                  onValueChange={() => handleToggle(category)}
                  trackColor={SWITCH_TRACK_COLOR}
                  thumbColor={Colors.white}
                />
              </View>
              {index < CATEGORIES.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.saveButton, updatePreferences.isPending && styles.saveButtonDisabled]}
        onPress={handleSave}
        activeOpacity={0.8}
        disabled={updatePreferences.isPending}
      >
        {updatePreferences.isPending ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <Text style={styles.saveText}>{t('notifications.savePreferences')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
