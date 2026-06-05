import { useQuery } from '@tanstack/react-query';
import type { Banner } from '@endemigo/shared';
import api from '../lib/api';

interface BannerResponse {
  code: string;
  message: string;
  banner: Banner;
}

export function useBanner(idOrSlug: string | undefined) {
  return useQuery<Banner | null>({
    queryKey: ['banner', idOrSlug],
    queryFn: async () => {
      if (!idOrSlug) return null;
      const { data } = await api.get<BannerResponse>(`/mobile/banners/${idOrSlug}`);
      return data.banner;
    },
    enabled: !!idOrSlug,
    staleTime: 60_000,
  });
}
