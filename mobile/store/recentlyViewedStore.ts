import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../lib/api';
import { useAuthStore } from './authStore';
import type { Product } from '../types';

interface RecentlyViewedState {
  items: Product[];
  isLoading: boolean;
  deviceToken: string | null;
  initializeDeviceToken: () => Promise<string>;
  recordView: (productId: string, referrer?: string) => Promise<void>;
  fetchRecentlyViewed: (page?: number, limit?: number) => Promise<void>;
  mergeGuestViewsToBackend: () => Promise<void>;
}

const DEVICE_TOKEN_KEY = 'endemigo_device_token';

async function getOrGenerateDeviceToken(): Promise<string> {
  let token = await SecureStore.getItemAsync(DEVICE_TOKEN_KEY);
  if (!token) {
    token = 'dt_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await SecureStore.setItemAsync(DEVICE_TOKEN_KEY, token);
  }
  return token;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>((set, get) => ({
  items: [],
  isLoading: false,
  deviceToken: null,

  initializeDeviceToken: async () => {
    const token = await getOrGenerateDeviceToken();
    set({ deviceToken: token });
    return token;
  },

  recordView: async (productId: string, referrer?: string) => {
    let token = get().deviceToken;
    if (!token) {
      token = await getOrGenerateDeviceToken();
      set({ deviceToken: token });
    }

    try {
      await api.post(`/products/${productId}/view`, {
        deviceToken: useAuthStore.getState().isLoggedIn ? undefined : token,
        referrer,
        platform: 'mobile',
      });
      await get().fetchRecentlyViewed(1, 10);
    } catch (error) {
      console.error('Error recording product view:', error);
    }
  },

  fetchRecentlyViewed: async (page = 1, limit = 10) => {
    let token = get().deviceToken;
    if (!token) {
      token = await getOrGenerateDeviceToken();
      set({ deviceToken: token });
    }

    set({ isLoading: true });
    try {
      const { data } = await api.get('/products/recently-viewed', {
        params: {
          deviceToken: useAuthStore.getState().isLoggedIn ? undefined : token,
          page,
          limit,
        },
      });
      set({ items: data.items ?? [], isLoading: false });
    } catch (error) {
      console.error('Error fetching recently viewed products:', error);
      set({ items: [], isLoading: false });
    }
  },

  mergeGuestViewsToBackend: async () => {
    if (!useAuthStore.getState().isLoggedIn) return;
    let token = get().deviceToken;
    if (!token) {
      token = await getOrGenerateDeviceToken();
      set({ deviceToken: token });
    }

    try {
      await api.post('/products/merge-views', { deviceToken: token });
      await get().fetchRecentlyViewed(1, 10);
    } catch (error) {
      console.error('Error merging guest views to backend:', error);
    }
  },
}));
