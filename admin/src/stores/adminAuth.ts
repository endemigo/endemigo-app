import { defineStore } from 'pinia';
import {
  ADMIN_USER_KEY,
  adminApi,
  clearStoredAdminToken,
  setStoredAdminToken,
  toApiMessage,
} from '../services/api';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  lastLoginAt: string | null;
}

interface AdminLoginResponse {
  code: string;
  message: string;
  admin: AdminUser;
  accessToken: string;
}

interface AdminMeResponse {
  code: string;
  message: string;
  admin: AdminUser;
}

interface AdminAuthState {
  admin: AdminUser | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
}

function isAdminUser(value: unknown): value is AdminUser {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.displayName === 'string' &&
    Array.isArray(candidate.roles)
  );
}

function readStoredAdmin(): AdminUser | null {
  const stored = window.localStorage.getItem(ADMIN_USER_KEY);
  if (!stored) return null;

  try {
    const parsed: unknown = JSON.parse(stored);
    return isAdminUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const useAdminAuthStore = defineStore('adminAuth', {
  state: (): AdminAuthState => ({
    admin: null,
    accessToken: window.localStorage.getItem('endemigo.admin.accessToken'),
    loading: false,
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken),
    roleLabel: (state) => state.admin?.roles.join(', ') ?? 'Rol yok',
  },
  actions: {
    loadSession() {
      this.accessToken = window.localStorage.getItem('endemigo.admin.accessToken');
      this.admin = readStoredAdmin();
    },
    async login(email: string, password: string) {
      this.loading = true;
      this.error = null;

      try {
        // POST /admin/auth/login is the separate admin auth contract.
        const response = await adminApi.post<AdminLoginResponse>('/admin/auth/login', {
          email,
          password,
        });
        this.admin = response.data.admin;
        this.accessToken = response.data.accessToken;
        setStoredAdminToken(response.data.accessToken);
        window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(response.data.admin));
      } catch (error) {
        this.error = toApiMessage(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async refreshMe() {
      if (!this.accessToken) return;

      const response = await adminApi.get<AdminMeResponse>('/admin/auth/me');
      this.admin = response.data.admin;
      window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(response.data.admin));
    },
    logout() {
      this.admin = null;
      this.accessToken = null;
      this.error = null;
      clearStoredAdminToken();
    },
  },
});
