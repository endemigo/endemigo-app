import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_PRODUCT_IMAGE_UPLOAD_LIMITS,
  getDefaultMobileExperienceConfig,
  sanitizeMobileExperienceConfig,
  type ProductImageUploadLimits,
  type MobileExperienceConfig,
} from '@endemigo/shared';
import api from '../lib/api';
import ENV from '../lib/config';

export interface MobileRuntimeConfig extends MobileExperienceConfig {
  imageUploadLimits: ProductImageUploadLimits;
}

interface MobileConfigResponse {
  code: string;
  message: string;
  config: MobileExperienceConfig;
  imageUploadLimits?: ProductImageUploadLimits;
  publishedAt: string | null;
}

export function useMobileConfig() {
  return useQuery<MobileRuntimeConfig>({
    queryKey: ['mobile-config'],
    queryFn: async () => {
      if (ENV.USE_MOCK) {
        return {
          ...getDefaultMobileExperienceConfig(),
          imageUploadLimits: DEFAULT_PRODUCT_IMAGE_UPLOAD_LIMITS,
        };
      }

      const { data } = await api.get<MobileConfigResponse>('/mobile/config');
      return {
        ...sanitizeMobileExperienceConfig(data.config),
        imageUploadLimits:
          data.imageUploadLimits ?? DEFAULT_PRODUCT_IMAGE_UPLOAD_LIMITS,
      };
    },
    staleTime: 60_000,
  });
}
