import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NotificationEventType } from '@endemigo/shared';
import api from '../lib/api';
import ENV from '../lib/config';
import {
  NOTIFICATION_QUERY_KEYS,
  type ApiResponseEnvelope,
  type NotificationItem,
  type NotificationPreferenceCategory,
  type NotificationPreferenceItem,
  type NotificationPreferencesPayload,
  type NotificationPreferencesUpdatePayload,
} from '../types/transactionFlows';

interface RawNotification {
  id: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse extends ApiResponseEnvelope {
  notifications: RawNotification[];
}

interface NotificationResponse extends ApiResponseEnvelope {
  notification: RawNotification;
}

interface NotificationPreferenceChannels {
  [NotificationEventType.AUCTION_OUTBID]?: NotificationChannelPreference;
  [NotificationEventType.AUCTION_STARTED]?: NotificationChannelPreference;
  [NotificationEventType.AUCTION_ENDED]?: NotificationChannelPreference;
  [NotificationEventType.AUCTION_WON]?: NotificationChannelPreference;
  [NotificationEventType.PAYMENT_REMINDER]?: NotificationChannelPreference;
  [NotificationEventType.PAYMENT_CONFIRMED]?: NotificationChannelPreference;
  [NotificationEventType.PAYMENT_FAILED]?: NotificationChannelPreference;
  [NotificationEventType.PAYMENT_REFUNDED]?: NotificationChannelPreference;
  [NotificationEventType.ORDER_STATUS_CHANGED]?: NotificationChannelPreference;
  [NotificationEventType.CARGO_STATUS_CHANGED]?: NotificationChannelPreference;
  [NotificationEventType.PAYOUT_REQUEST_APPROVED]?: NotificationChannelPreference;
  [NotificationEventType.PAYOUT_REQUEST_REJECTED]?: NotificationChannelPreference;
  [NotificationEventType.ASK_PRICE]?: NotificationChannelPreference;
}

interface NotificationChannelPreference {
  inApp: boolean;
  push: boolean;
}

interface PreferencesResponse extends ApiResponseEnvelope {
  preferences: {
    channels: NotificationPreferenceChannels;
  };
}

const CATEGORY_EVENT_TYPES: Record<NotificationPreferenceCategory, NotificationEventType[]> = {
  order: [NotificationEventType.ORDER_STATUS_CHANGED],
  cargo: [NotificationEventType.CARGO_STATUS_CHANGED],
  auction: [
    NotificationEventType.AUCTION_OUTBID,
    NotificationEventType.AUCTION_STARTED,
    NotificationEventType.AUCTION_ENDED,
    NotificationEventType.AUCTION_WON,
  ],
  payment: [
    NotificationEventType.PAYMENT_REMINDER,
    NotificationEventType.PAYMENT_CONFIRMED,
    NotificationEventType.PAYMENT_FAILED,
    NotificationEventType.PAYMENT_REFUNDED,
    NotificationEventType.PAYOUT_REQUEST_APPROVED,
    NotificationEventType.PAYOUT_REQUEST_REJECTED,
  ],
};

const ACTION_EVENT_TYPES = new Set<NotificationEventType>([
  NotificationEventType.PAYMENT_REMINDER,
  NotificationEventType.PAYMENT_FAILED,
  NotificationEventType.ORDER_STATUS_CHANGED,
  NotificationEventType.CARGO_STATUS_CHANGED,
  NotificationEventType.ASK_PRICE,
]);

function getActionRoute(notification: RawNotification) {
  if (!notification.relatedEntityId) return null;
  if (notification.relatedEntityType === 'order') {
    return `/(tabs)/orders/${notification.relatedEntityId}`;
  }
  if (notification.relatedEntityType === 'auction') {
    return `/auction/${notification.relatedEntityId}`;
  }
  return null;
}

function normalizeNotification(notification: RawNotification): NotificationItem {
  const actionRoute = getActionRoute(notification);
  return {
    id: notification.id,
    eventType: notification.eventType,
    title: notification.title,
    body: notification.body,
    requiresAction: ACTION_EVENT_TYPES.has(notification.eventType) && Boolean(actionRoute),
    actionRoute,
    actionEntityId: notification.relatedEntityId,
    relatedEntityType: notification.relatedEntityType,
    relatedEntityId: notification.relatedEntityId,
    isRead: Boolean(notification.readAt),
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}

function normalizePreferences(channels: NotificationPreferenceChannels): NotificationPreferencesPayload {
  const categories = Object.entries(CATEGORY_EVENT_TYPES).map(([category, eventTypes]) => {
    const firstEnabled = eventTypes.some((eventType) => channels[eventType]?.inApp ?? true);
    const pushEnabled = eventTypes.some((eventType) => channels[eventType]?.push ?? true);
    return {
      category: category as NotificationPreferenceCategory,
      inApp: firstEnabled,
      push: pushEnabled,
    };
  });
  return { categories };
}

function toChannels(payload: NotificationPreferencesUpdatePayload) {
  return payload.categories.reduce<NotificationPreferenceChannels>((acc, item) => {
    CATEGORY_EVENT_TYPES[item.category].forEach((eventType) => {
      acc[eventType] = { inApp: item.inApp, push: item.push };
    });
    return acc;
  }, {});
}

export function useNotifications() {
  return useQuery<NotificationItem[]>({
    queryKey: NOTIFICATION_QUERY_KEYS.list,
    queryFn: async () => {
      if (ENV.USE_MOCK) return [];
      const { data } = await api.get<NotificationsResponse>('/notifications');
      return data.notifications.map(normalizeNotification).sort((a, b) => {
        if (a.requiresAction !== b.requiresAction) return a.requiresAction ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation<NotificationItem, Error, string>({
    mutationFn: async (id) => {
      if (ENV.USE_MOCK) {
        throw new Error('Mock notification read is not available');
      }
      const { data } = await api.patch<NotificationResponse>(`/notifications/${id}/read`);
      return normalizeNotification(data.notification);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.list });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, NotificationItem[]>({
    mutationFn: async (notifications) => {
      if (ENV.USE_MOCK) return;
      await Promise.all(
        notifications.filter((notification) => !notification.isRead).map((notification) =>
          api.patch(`/notifications/${notification.id}/read`),
        ),
      );
    },
    onMutate: async (notifications) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_QUERY_KEYS.list });
      const rollback = queryClient.getQueryData<NotificationItem[]>(NOTIFICATION_QUERY_KEYS.list);
      queryClient.setQueryData<NotificationItem[]>(
        NOTIFICATION_QUERY_KEYS.list,
        notifications.map((notification) => ({ ...notification, isRead: true })),
      );
      return { rollback };
    },
    onError: (_error, _notifications, context) => {
      if (context?.rollback) {
        queryClient.setQueryData(NOTIFICATION_QUERY_KEYS.list, context.rollback);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.list });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreferencesPayload>({
    queryKey: NOTIFICATION_QUERY_KEYS.preferences,
    queryFn: async () => {
      if (ENV.USE_MOCK) {
        return {
          categories: ['order', 'cargo', 'auction', 'payment'].map((category) => ({
            category: category as NotificationPreferenceCategory,
            inApp: true,
            push: true,
          })),
        };
      }
      const { data } = await api.get<PreferencesResponse>('/notifications/preferences');
      return normalizePreferences(data.preferences.channels);
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation<NotificationPreferencesPayload, Error, NotificationPreferencesUpdatePayload>({
    mutationFn: async (payload) => {
      if (ENV.USE_MOCK) return payload;
      const { data } = await api.patch<PreferencesResponse>('/notifications/preferences', {
        channels: toChannels(payload),
      });
      return normalizePreferences(data.preferences.channels);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.preferences });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.list });
    },
  });
}
