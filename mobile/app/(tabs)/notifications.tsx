import React, { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../../hooks/useNotifications';
import type { NotificationItem } from '../../types/transactionFlows';
import { formatShortDateTime } from '../../utils/transactionFormatters';
import { styles } from '../../styles/tabs/notifications.styles';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const { requiredAction, informational } = useMemo(() => {
    const items = notifications.data ?? [];
    return {
      requiredAction: items.filter((item) => item.requiresAction),
      informational: items.filter((item) => !item.requiresAction),
    };
  }, [notifications.data]);

  const handleOpen = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await markRead.mutateAsync(notification.id);
    }
    if (notification.actionRoute) {
      router.push(notification.actionRoute as never);
      return;
    }
    if (notification.relatedEntityType === 'auction' && notification.relatedEntityId) {
      router.push(`/auction/${notification.relatedEntityId}` as never);
      return;
    }
    // Etkinlik bildirimleri (davet, satış onayı vb.) canlı müzayede ekranını açar.
    if (notification.relatedEntityType === 'auction_event' && notification.relatedEntityId) {
      router.push(`/auction/event/${notification.relatedEntityId}` as never);
      return;
    }
    if (notification.relatedEntityType === 'order' && notification.relatedEntityId) {
      router.push(`/(tabs)/orders/${notification.relatedEntityId}` as never);
    }
  };

  const renderNotification = (notification: NotificationItem) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationCard,
        !notification.isRead && styles.unreadCard,
        notification.requiresAction && styles.actionCard,
      ]}
      onPress={() => handleOpen(notification)}
      activeOpacity={0.75}
    >
      <View style={[styles.iconBox, notification.requiresAction && styles.actionIconBox]}>
        <Ionicons
          name={notification.requiresAction ? 'flash-outline' : 'notifications-outline'}
          size={22}
          color={notification.requiresAction ? Colors.tertiary : Colors.primary}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.notificationTitle} numberOfLines={1}>{notification.title}</Text>
          {notification.requiresAction && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('notifications.actionRequired')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
        <Text style={styles.date}>{formatShortDateTime(notification.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (notifications.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.centerBody}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (notifications.isError) {
    return (
      <View style={styles.center}>
        <Ionicons name="notifications-outline" size={52} color={Colors.slate300} />
        <Text style={styles.centerTitle}>{t('notifications.loadError')}</Text>
        <Text style={styles.centerBody}>{t('common.genericError')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => notifications.refetch()} activeOpacity={0.8}>
          <Text style={styles.retryText}>{t('notifications.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Tabs.Screen
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 8 }}>
              <TouchableOpacity
                style={{ padding: 8 }}
                onPress={() => markAllRead.mutate(notifications.data ?? [])}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-done-outline" size={22} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 8 }}
                onPress={() => router.push('/(tabs)/notification-preferences' as never)}
                activeOpacity={0.7}
              >
                <Ionicons name="options-outline" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={notifications.isRefetching || markAllRead.isPending}
            onRefresh={notifications.refetch}
            tintColor={Colors.primary}
          />
        }
      >

      {requiredAction.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('notifications.actionRequired')}</Text>
          {requiredAction.map(renderNotification)}
        </>
      )}

      {informational.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('notifications.informational')}</Text>
          {informational.map(renderNotification)}
        </>
      )}

      {requiredAction.length === 0 && informational.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="file-tray-outline" size={48} color={Colors.slate300} />
          <Text style={styles.centerTitle}>{t('notifications.emptyTitle')}</Text>
          <Text style={styles.centerBody}>{t('notifications.emptyBody')}</Text>
        </View>
      )}
    </ScrollView>
    </>
  );
}
