import { create } from 'zustand';
import { storage } from '../lib/storage';
import api from '../lib/api';
import ENV from '../lib/config';
import { mockService } from '../lib/mockService';
import { useRoleModeStore } from './roleModeStore';
import { disconnectAuctionSocket } from '../services/socket';
import { disconnectNegotiationSocket } from '../services/negotiationSocket';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isSeller: boolean;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string, kvkkAccepted?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setUser: (user: User) => void;
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }) => Promise<void>;
}

/**
 * GLOBAL AUTH STORE (Zustand)
 * Mimari Tercihi: Neden Redux Toolkit yerine Zustand kullanıyoruz?
 * React Native ortamında (özellikle re-render optimizasyonu açısından) User/Token verisini tutmak için 
 * Redux gereksiz kalabalık bir boilerplate (iş yükü) yaratmaktadır. Zustand çok daha hafif ve hızlı çalışır.
 *
 * Burada sadece uygulamanın UI state'ı "User Logged In mi?" ve "Loading mi?" nesnelerini (Client state) yönetiyoruz.
 * Access ve Refresh tokenlar güvenliğinden ötürü Native Storage (SecureStore) içerisinde tutulur, state'te barındırılmaz!
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoggedIn: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const data = ENV.USE_MOCK
      ? await mockService.login(email, password)
      : (await api.post('/auth/login', { email, password })).data;
    await storage.setToken(data.accessToken);
    if (data.refreshToken) await storage.setRefreshToken(data.refreshToken);
    await storage.setUser(data.user);
    // Drop any anonymous/previous socket so it reconnects with the new token.
    disconnectAuctionSocket();
    disconnectNegotiationSocket();
    useRoleModeStore.getState().syncRoleModeFromUser(data.user);
    set({ user: data.user, isLoggedIn: true });
  },

  register: async (email: string, password: string, firstName?: string, lastName?: string, kvkkAccepted?: boolean) => {
    const data = ENV.USE_MOCK
      ? await mockService.register(email, password, firstName, lastName)
      : (await api.post('/auth/register', { email, password, firstName, lastName, kvkkAccepted })).data;
    await storage.setToken(data.accessToken);
    if (data.refreshToken) await storage.setRefreshToken(data.refreshToken);
    await storage.setUser(data.user);
    disconnectAuctionSocket();
    disconnectNegotiationSocket();
    useRoleModeStore.getState().syncRoleModeFromUser(data.user);
    set({ user: data.user, isLoggedIn: true });
  },

  logout: async () => {
    /** 
     * Backend'de Refresh Token'ı silme kararı (Server-side revocation).
     * Bu güvenlik adına kritiktir, sadece cihazdan silinmesi tokenı ağ bazında "Log out" yapmaz. 
     */
    try {
      const refreshToken = await storage.getRefreshToken();
      if (refreshToken && !ENV.USE_MOCK) {
        await api.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } catch {} // eslint-disable-line no-empty
    await storage.clear();
    // Tear down the authenticated sockets so they cannot keep delivering
    // personalized events to a logged-out session.
    disconnectAuctionSocket();
    disconnectNegotiationSocket();
    useRoleModeStore.getState().resetRoleMode();
    set({ user: null, isLoggedIn: false });
  },

  restoreSession: async () => {
    /**
     * App (splash screen) açıldığında ilk tetiklenen fonksiyondur.
     * Depodan token okur, token varsa /auth/profile vurarak User objesini yenileriz.
     * Fetch fail olursa 'Storage.clear()' çalıştırarak kullanıcıyı Login'e atar.
     */
    try {
      let user;
      if (ENV.USE_MOCK) {
        const stored = await storage.getUser();
        user = stored || null;
      } else {
        const token = await storage.getToken();
        if (!token) { set({ isLoading: false }); return; }
        const { data } = await api.get('/auth/profile');
        user = data;
      }
      if (user) {
        useRoleModeStore.getState().syncRoleModeFromUser(user);
        set({ user, isLoggedIn: true, isLoading: false });
      } else {
        useRoleModeStore.getState().resetRoleMode();
        set({ isLoading: false });
      }
    } catch {
      await storage.clear();
      useRoleModeStore.getState().resetRoleMode();
      set({ user: null, isLoggedIn: false, isLoading: false });
    }
  },

  setUser: (user: User) => {
    storage.setUser(user);
    useRoleModeStore.getState().syncRoleModeFromUser(user);
    set({ user });
  },

  updateProfile: async (data: { firstName?: string; lastName?: string; phone?: string }) => {
    const response = await api.patch('/users/profile', data);
    const current = get().user;
    if (current) {
      const updated: User = {
        ...current,
        firstName: response.data.firstName ?? current.firstName,
        lastName: response.data.lastName ?? current.lastName,
        phone: response.data.phone ?? current.phone,
      };
      await storage.setUser(updated);
      set({ user: updated });
    }
  },
}));
