import { useEffect } from 'react';
import { LogLevel, OneSignal } from 'react-native-onesignal';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import ENV from '../lib/config';

// Push tıklaması → ilgili ekran. Backend, bildirime relatedEntityType/Id koyar.
function resolveNotificationRoute(data: Record<string, unknown> | undefined): string | null {
  const type = typeof data?.relatedEntityType === 'string' ? data.relatedEntityType : null;
  const id = typeof data?.relatedEntityId === 'string' ? data.relatedEntityId : null;
  if (!type || !id) return null;
  switch (type) {
    case 'auction':
      return `/auction/${id}`;
    case 'auction_event':
      return `/auction/event/${id}`;
    case 'order':
      return `/(tabs)/orders/${id}`;
    case 'payment':
      return '/cart';
    default:
      return null;
  }
}

export const useOneSignal = () => {
  const { user, isLoggedIn } = useAuthStore();

  useEffect(() => {
    // OneSignal App ID yapılandırılmamışsa veya boşsa init etme
    if (!ENV.ONESIGNAL_APP_ID || ENV.ONESIGNAL_APP_ID === '00000000-0000-0000-0000-000000000000') {
      console.warn('OneSignal App ID is not configured. Push notifications are disabled.');
      return;
    }

    // 1. OneSignal SDK'sını başlat
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    OneSignal.initialize(ENV.ONESIGNAL_APP_ID);

    // 2. Bildirim izni iste
    OneSignal.Notifications.requestPermission(true).then((granted) => {
      console.log('Push notifications permission granted:', granted);
    });

    // 3. Bildirim tıklaması → ilgili müzayede/sipariş ekranına yönlendir
    const handleNotificationClick = (event: any) => {
      const route = resolveNotificationRoute(event?.notification?.additionalData);
      if (route) {
        router.push(route as never);
      }
    };

    OneSignal.Notifications.addEventListener('click', handleNotificationClick);

    return () => {
      OneSignal.Notifications.removeEventListener('click', handleNotificationClick);
    };
  }, []);

  // 4. Kullanıcı oturum durumuna göre harici kimliği (external_id) eşle
  useEffect(() => {
    if (!ENV.ONESIGNAL_APP_ID || ENV.ONESIGNAL_APP_ID === '00000000-0000-0000-0000-000000000000') {
      return;
    }

    if (isLoggedIn && user?.id) {
      console.log(`Linking user to OneSignal with external_id: ${user.id}`);
      OneSignal.login(user.id);
    } else {
      console.log('Logging out from OneSignal');
      OneSignal.logout();
    }
  }, [isLoggedIn, user?.id]);
};
