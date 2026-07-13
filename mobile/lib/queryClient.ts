import { QueryClient } from '@tanstack/react-query';

// 4xx (özellikle 429 rate-limit, ayrıca 401/403/404) retry'lamak anlamsız ve
// zararlı: 429'da her başarısız sorgu 2 kez daha denenince istek hacmi katlanıp
// limiti daha da aşar (kısır döngü). Yalnız ağ hatası / 5xx retry edilir.
const isClientError = (error: unknown): boolean => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => !isClientError(error) && failureCount < 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      staleTime: 5 * 60 * 1000, // 5 min
    },
    mutations: {
      retry: (failureCount, error) => !isClientError(error) && failureCount < 1,
    },
  },
});
