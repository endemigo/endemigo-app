import { User } from '@/types';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'endemigo_access_token',
  REFRESH_TOKEN: 'endemigo_refresh_token',
  USER: 'endemigo_user',
  LAUNCH_SPLASH_IMAGES: 'endemigo_launch_splash_images',
};

function isStoredUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const user = value as Partial<User>;
  return typeof user.id === 'string' && typeof user.email === 'string';
}

export const storage = {
  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  },
  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, token);
  },
  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
  },
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  },
  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, token);
  },
  async removeRefreshToken(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
  },
  async getUser(): Promise<User | null> {
    const raw = await SecureStore.getItemAsync(KEYS.USER);
    if (!raw) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      return isStoredUser(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  async setUser(user: User | null): Promise<void> {
    if (user === null) {
      await SecureStore.deleteItemAsync(KEYS.USER);
    } else {
      await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user));
    }
  },
  async removeUser(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.USER);
  },
  async getLaunchSplashImages(): Promise<string[]> {
    const raw = await SecureStore.getItemAsync(KEYS.LAUNCH_SPLASH_IMAGES);
    if (!raw) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    } catch {
      return [];
    }
  },
  async setLaunchSplashImages(images: string[]): Promise<void> {
    const uniqueImages = Array.from(
      new Set(images.filter((value) => typeof value === 'string' && value.trim().length > 0)),
    ).slice(0, 12);

    if (!uniqueImages.length) {
      await SecureStore.deleteItemAsync(KEYS.LAUNCH_SPLASH_IMAGES);
      return;
    }

    await SecureStore.setItemAsync(KEYS.LAUNCH_SPLASH_IMAGES, JSON.stringify(uniqueImages));
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(KEYS.USER);
  },
};
