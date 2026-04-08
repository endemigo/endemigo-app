import { create } from 'zustand';
import { storage } from '../lib/storage';
import api from '../lib/api';
import ENV from '../lib/config';
import { mockService } from '../lib/mockService';

interface XUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSeller: boolean;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
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
    set({ user: data.user, isLoggedIn: true });
  },

  register: async (email: string, password: string, firstName?: string, lastName?: string) => {
    const data = ENV.USE_MOCK
      ? await mockService.register(email, password, firstName, lastName)
      : (await api.post('/auth/register', { email, password, firstName, lastName })).data;
    await storage.setToken(data.accessToken);
    if (data.refreshToken) await storage.setRefreshToken(data.refreshToken);
    await storage.setUser(data.user);
    set({ user: data.user, isLoggedIn: true });
  },

  logout: async () => {
    // Revoke refresh token server-side
    try {
      const refreshToken = await storage.getRefreshToken();
      if (refreshToken && !ENV.USE_MOCK) {
        await api.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } catch {} // eslint-disable-line no-empty
    await storage.clear();
    set({ user: null, isLoggedIn: false });
  },

  restoreSession: async () => {
    try {
      let user;
      if (ENV.USE_MOCK) {
        // In mock mode restore from storage if available, else skip session
        const stored = await storage.getUser?.();
        user = stored || null;
      } else {
        const token = await storage.getToken();
        if (!token) { set({ isLoading: false }); return; }
        const { data } = await api.get('/auth/profile');
        user = data;
      }
      if (user) set({ user, isLoggedIn: true, isLoading: false });
      else set({ isLoading: false });
    } catch {
      await storage.clear();
      set({ user: null, isLoggedIn: false, isLoading: false });
    }
  },

  setUser: (user: User) => {
    storage.setUser(user);
    set({ user });
  },
}));
