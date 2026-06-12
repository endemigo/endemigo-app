import axios, { AxiosError, type AxiosResponse } from 'axios';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3030';
export const ADMIN_TOKEN_KEY = 'endemigo.admin.accessToken';
export const ADMIN_USER_KEY = 'endemigo.admin.user';

export interface ApiEnvelope {
  code: string;
  message: string;
}

export interface ApiListPagination {
  page: number;
  limit: number;
  total: number;
}

export interface ApiListResponse extends ApiEnvelope {
  resource: string;
  items: Record<string, unknown>[];
  pagination: ApiListPagination;
}

export function getStoredAdminToken(): string | null {
  return window.localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setStoredAdminToken(token: string): void {
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearStoredAdminToken(): void {
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_USER_KEY);
}

export const adminApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

adminApi.interceptors.request.use((config) => {
  const token = getStoredAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiEnvelope>) => {
    if (error.response?.status === 401) {
      clearStoredAdminToken();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

export function toApiMessage(error: unknown): string {
  if (axios.isAxiosError<ApiEnvelope>(error)) {
    return error.response?.data?.code ?? error.response?.data?.message ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Beklenmeyen hata';
}
