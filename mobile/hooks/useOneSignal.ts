import { useEffect } from 'react';
import { LogLevel, OneSignal } from 'react-native-onesignal';
import { useAuthStore } from '../store/authStore';
import ENV from '../lib/config';

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

    // 3. Bildirim tıklama olaylarını dinle (opsiyonel)
    const handleNotificationClick = (event: any) => {
      console.log('Notification clicked:', event);
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
