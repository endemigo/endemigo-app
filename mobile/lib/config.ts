const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030',
  /**
   * Mock mode — backend hazır olunca false yap:
   *   EXPO_PUBLIC_USE_MOCK=false npx expo start
   */
  USE_MOCK: process.env.EXPO_PUBLIC_USE_MOCK !== 'false',
  ONESIGNAL_APP_ID: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '',
};

export default ENV;
