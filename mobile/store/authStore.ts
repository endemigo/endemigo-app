import { create } from 'zustand';
import { storage } from '../lib/storage';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    await storage.setToken(data.accessToken);
    await storage.setUser(data.user);
    set({ user: data.user, isLoggedIn: true });
  },

  register: async (email: string, password: string, firstName?: string, lastName?: string) => {
    const { data } = await api.post('/auth/register', { email, password, firstName, lastName });
    await storage.setToken(data.accessToken);
    await storage.setUser(data.user);
    set({ user: data.user, isLoggedIn: true });
  },

  logout: async () => {
    await storage.clear();
    set({ user: null, isLoggedIn: false });
  },

  restoreSession: async () => {
    try {
      const token = await storage.getToken();
      if (token) {
        const { data } = await api.get('/auth/profile');
        set({ user: data, isLoggedIn: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await storage.clear();
      set({ user: null, isLoggedIn: false, isLoading: false });
    }
  },
}));
