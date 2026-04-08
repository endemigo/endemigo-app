import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage } from './storage';
import ENV from './config';

const api = axios.create({
  baseURL: ENV.API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Neden isRefreshing ve failedQueue kullanıyoruz? (Mimari Gerekçe)
 * - Eğer birden fazla istek aynı anda 401 Unauthenticated yanıtı alırsa, cihazın 10 farklı
 *   refresh-token isteği atmasını engellememiz gerekir (Bu hem sunucuyu boğar hem de
 *   Rotate edilen Token'ların "Blacklist"e düşmesine neden olur).
 * - İlk 401 hatasında isRefreshing = true yapılır, sonraki tüm istekler `failedQueue`
 *   içinde Promise bekletme (Suspend) moduna alınır. Refresh bitince hepsi sırayla çalıştırılır.
 */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string | null) => void;
  reject: (error: Error | unknown) => void;
}> = [];

const processQueue = (error: Error | unknown | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Request Interceptor (Giden İstekler Öncesi)
 * Amacı: Her istek atıldığında Local Storage'dan JWT token alıp `Authorization` başlığına (Header) eklemek.
 * Mimari Tercih: Redux/Zustand store'dan okumak yerine Native Storage'dan okumayı tercih ettik, 
 * çünkü Context veya Zustand ağacı dışında (background tasks vs) çalışan servislerin de erişmesi gerekir.
 */
api.interceptors.request.use(async (config) => {
  const token = await storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Response Interceptor (Gelen Yanıtları Yakalama)
 * Amacı: Token'ın expire (süresinin dolması) durumunda otomatik Refresh (Yenileme) yapmak.
 * Bu sayede kullanıcı, müzayede ortasında "oturumunuz düştü" uyarısı almak yerine
 * arka planda kesintisiz (seamless) bir şekilde yeni token alarak API isteğine devam edecektir.
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Zaten yenilenen bir endpoint (auth/refresh) ise veya retry edildiyse, recursive (sonsuz) döngüye girmeyi engelle.
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Refresh döngüsüne yakalanmaması gereken Auth endpointleri
    const url = originalRequest.url || '';
    if (url.includes('/auth/refresh') || url.includes('/auth/login') || url.includes('/auth/register')) {
      await storage.clear();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue the request while refreshing
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await storage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await axios.post(`${ENV.API_URL}/auth/refresh`, {
        refreshToken,
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data;
      await storage.setToken(accessToken);
      await storage.setRefreshToken(newRefreshToken);

      processQueue(null, accessToken);

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await storage.clear();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
