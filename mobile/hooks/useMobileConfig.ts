import { useQuery } from '@tanstack/react-query';
import {
  getDefaultMobileExperienceConfig,
  sanitizeMobileExperienceConfig,
  type MobileExperienceConfig,
} from '@endemigo/shared';
import api from '../lib/api';
import ENV from '../lib/config';

interface MobileConfigResponse {
  code: string;
  message: string;
  config: MobileExperienceConfig;
  publishedAt: string | null;
}

export function useMobileConfig() {
  return useQuery<MobileExperienceConfig>({
    queryKey: ['mobile-config'],
    queryFn: async () => {
      if (ENV.USE_MOCK) {
        return getDefaultMobileExperienceConfig();
      }

      const { data } = await api.get<MobileConfigResponse>('/mobile/config');
      return sanitizeMobileExperienceConfig(data.config);
    },
    staleTime: 60_000,
  });
}
