import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../lib/api';
import { useAuthStore } from './authStore';
import type { Product } from '../types';

interface FavoritesState {
  items: Product[];
  isLoading: boolean;
  hydrateFavorites: () => Promise<void>;
  mergeGuestFavoritesToBackend: () => Promise<void>;
  toggleFavoriteLocal: (product: Product) => Promise<boolean>;
  clearLocalFavorites: () => Promise<void>;
}

const GUEST_FAVORITES_STORAGE_KEY = 'endemigo_guest_favorites_v1';

async function getGuestFavorites(): Promise<Product[]> {
  const raw = await SecureStore.getItemAsync(GUEST_FAVORITES_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setGuestFavorites(items: Product[]): Promise<void> {
  await SecureStore.setItemAsync(GUEST_FAVORITES_STORAGE_KEY, JSON.stringify(items));
}

async function clearGuestFavoritesStorage(): Promise<void> {
  await SecureStore.deleteItemAsync(GUEST_FAVORITES_STORAGE_KEY);
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  items: [],
  isLoading: false,

  hydrateFavorites: async () => {
    set({ isLoading: true });
    try {
      if (useAuthStore.getState().isLoggedIn) {
        set({ items: [], isLoading: false });
        return;
      }
      const localItems = await getGuestFavorites();
      set({ items: localItems, isLoading: false });
    } catch {
      set({ items: [], isLoading: false });
    }
  },

  toggleFavoriteLocal: async (product: Product) => {
    const current = await getGuestFavorites();
    const exists = current.some((item) => item.id === product.id);
    let nextItems: Product[];
    let isFavorited: boolean;

    if (exists) {
      nextItems = current.filter((item) => item.id !== product.id);
      isFavorited = false;
    } else {
      nextItems = [
        ...current,
        {
          ...product,
          isFavorited: true,
          favoritedAt: new Date().toISOString(),
        },
      ];
      isFavorited = true;
    }

    await setGuestFavorites(nextItems);
    set({ items: nextItems });
    return isFavorited;
  },

  mergeGuestFavoritesToBackend: async () => {
    if (!useAuthStore.getState().isLoggedIn) return;
    const localItems = await getGuestFavorites();
    if (localItems.length === 0) return;

    try {
      // 1. Fetch remote favorites to prevent toggling off already favorited items
      const { data } = await api.get<{ items: Product[] }>('/favorites?page=1&limit=100');
      const remoteIds = new Set((data?.items ?? []).map((item) => item.id));

      // 2. Identify and toggle only favorites that are not already present on server
      for (const item of localItems) {
        if (!remoteIds.has(item.id)) {
          await api.post(`/favorites/${item.id}`);
        }
      }
    } catch (error) {
      console.error('Error merging favorites to backend:', error);
    } finally {
      // Clear guest favorites after merge attempt
      await clearGuestFavoritesStorage();
      set({ items: [] });
    }
  },

  clearLocalFavorites: async () => {
    await clearGuestFavoritesStorage();
    set({ items: [] });
  },
}));
