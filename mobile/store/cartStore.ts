import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../lib/api';
import { useAuthStore } from './authStore';

export interface CartItem {
  id: string;
  productId: string;
  productVariantSkuId?: string | null;
  variantId?: string | null;
  auctionId?: string | null;
  offerId?: string | null;
  customPrice?: number | null;
  title: string;
  price: number;
  imageUrl?: string;
  quantity: number;
  addedAt?: string;
  sellerId?: string;
}

interface AddCartPayload {
  productId: string;
  productVariantSkuId?: string | null;
  variantId?: string | null;
  title: string;
  price: number;
  imageUrl?: string;
  sellerId?: string;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  hydrateCart: () => Promise<void>;
  mergeGuestCartToBackend: () => Promise<void>;
  addItem: (payload: AddCartPayload) => Promise<void>;
  updateItemQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

interface CartApiResponse {
  cart?: {
    items?: Array<{
      id: string;
      productId: string;
      productVariantSkuId?: string | null;
      variantId?: string | null;
      auctionId?: string | null;
      offerId?: string | null;
      customPrice?: number | string | null;
      quantity: number;
      addedAt?: string;
      product?: {
        title?: string;
        price?: number | string;
        imageUrl?: string;
      } | null;
    }>;
  };
}

const GUEST_CART_STORAGE_KEY = 'endemigo_guest_cart_v1';

async function getGuestCartItems(): Promise<CartItem[]> {
  const raw = await SecureStore.getItemAsync(GUEST_CART_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setGuestCartItems(items: CartItem[]): Promise<void> {
  await SecureStore.setItemAsync(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
}

async function clearGuestCartItems(): Promise<void> {
  await SecureStore.deleteItemAsync(GUEST_CART_STORAGE_KEY);
}

function mapApiItemsToStore(data: CartApiResponse): CartItem[] {
  const items = data.cart?.items ?? [];
  return items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productVariantSkuId: item.productVariantSkuId ?? null,
    variantId: item.variantId ?? null,
    auctionId: item.auctionId ?? null,
    offerId: item.offerId ?? null,
    customPrice: item.customPrice !== undefined && item.customPrice !== null ? Number(item.customPrice) : null,
    quantity: item.quantity,
    addedAt: item.addedAt,
    title: item.product?.title ?? '',
    price: Number(item.customPrice !== undefined && item.customPrice !== null ? item.customPrice : (item.product?.price ?? 0)),
    imageUrl: item.product?.imageUrl,
    sellerId: (item as any).product?.sellerId,
  }));
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  isLoading: false,

  hydrateCart: async () => {
    set({ isLoading: true });
    try {
      if (useAuthStore.getState().isLoggedIn) {
        const { data } = await api.get<CartApiResponse>('/cart');
        set({ items: mapApiItemsToStore(data), isLoading: false });
        return;
      }
      const guestItems = await getGuestCartItems();
      set({ items: guestItems, isLoading: false });
    } catch {
      set({ items: [], isLoading: false });
    }
  },

  mergeGuestCartToBackend: async () => {
    if (!useAuthStore.getState().isLoggedIn) return;
    const guestItems = await getGuestCartItems();
    for (const item of guestItems) {
      await api.post<CartApiResponse>('/cart/items', {
        productId: item.productId,
        productVariantSkuId: item.productVariantSkuId ?? undefined,
        variantId: item.variantId ?? undefined,
        quantity: item.quantity,
      });
    }
    await clearGuestCartItems();
    const { data } = await api.get<CartApiResponse>('/cart');
    set({ items: mapApiItemsToStore(data) });
  },

  addItem: async (payload) => {
    if (!useAuthStore.getState().isLoggedIn) {
      const items = await getGuestCartItems();
      const existing = items.find(
        (item) =>
          item.productId === payload.productId
          && (item.productVariantSkuId ?? null) === (payload.productVariantSkuId ?? null)
          && (item.variantId ?? null) === (payload.variantId ?? null),
      );
      let nextItems: CartItem[];
      if (existing) {
        nextItems = items.map((item) =>
          item.productId === payload.productId
            && (item.productVariantSkuId ?? null) === (payload.productVariantSkuId ?? null)
            && (item.variantId ?? null) === (payload.variantId ?? null)
            ? { ...item, quantity: Math.min(99, item.quantity + 1) }
            : item,
        );
      } else {
        const guestSuffix = payload.productVariantSkuId ?? payload.variantId;
        const guestItemId = guestSuffix
          ? `${payload.productId}:${guestSuffix}`
          : payload.productId;
        nextItems = [
          ...items,
          {
            id: guestItemId,
            productId: payload.productId,
            productVariantSkuId: payload.productVariantSkuId ?? null,
            variantId: payload.variantId ?? null,
            title: payload.title,
            price: payload.price,
            imageUrl: payload.imageUrl,
            sellerId: payload.sellerId,
            quantity: 1,
            addedAt: new Date().toISOString(),
          },
        ];
      }
      await setGuestCartItems(nextItems);
      set({ items: nextItems });
      return;
    }
    const { data } = await api.post<CartApiResponse>('/cart/items', {
      productId: payload.productId,
      productVariantSkuId: payload.productVariantSkuId,
      variantId: payload.variantId,
      quantity: 1,
    });
    set({ items: mapApiItemsToStore(data) });
  },

  updateItemQuantity: async (itemId, quantity) => {
    if (!useAuthStore.getState().isLoggedIn) {
      const items = await getGuestCartItems();
      const nextItems = items.map((item) =>
        item.id === itemId ? { ...item, quantity } : item,
      );
      await setGuestCartItems(nextItems);
      set({ items: nextItems });
      return;
    }
    const { data } = await api.patch<CartApiResponse>(`/cart/items/${itemId}`, { quantity });
    set({ items: mapApiItemsToStore(data) });
  },

  removeItem: async (itemId) => {
    if (!useAuthStore.getState().isLoggedIn) {
      const items = await getGuestCartItems();
      const nextItems = items.filter((item) => item.id !== itemId);
      await setGuestCartItems(nextItems);
      set({ items: nextItems });
      return;
    }
    const { data } = await api.delete<CartApiResponse>(`/cart/items/${itemId}`);
    set({ items: mapApiItemsToStore(data) });
  },

  clearCart: async () => {
    if (!useAuthStore.getState().isLoggedIn) {
      await clearGuestCartItems();
      set({ items: [] });
      return;
    }
    const { data } = await api.delete<CartApiResponse>('/cart');
    set({ items: mapApiItemsToStore(data) });
  },
}));
