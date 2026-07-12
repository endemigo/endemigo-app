import { Platform } from 'react-native';

const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || `http://${DEV_HOST}:3030`,
  /**
   * Mock mode — backend hazır olunca false yap:
   *   EXPO_PUBLIC_USE_MOCK=false npx expo start
   */
  USE_MOCK: process.env.EXPO_PUBLIC_USE_MOCK !== 'false',
  ONESIGNAL_APP_ID: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '',
  /** Web satıcı paneli — toplu/müzayede ürün yüklemesi buradan yapılır. */
  SELLER_WEB_URL: process.env.EXPO_PUBLIC_SELLER_WEB_URL || 'https://satici.endemigo.com',
};

export default ENV;
