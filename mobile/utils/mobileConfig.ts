import {
  MobileAudience,
  resolveLocalizedText as sharedResolveLocalizedText,
  type LocalizedText,
  type MobileAuctionListCardConfig,
  type MobileAuctionListCardAudienceOverride,
  type MobileConfigBlockBase,
  type MobileLocale,
  type MobileProductCardAudienceOverride,
  type MobileProductCardConfig,
} from '@endemigo/shared';
import ENV from '../lib/config';
import type { User } from '../store/authStore';
import type { RoleMode } from '../types/transactionFlows';

// Local storage sürücüsü görselleri `/uploads/...` şeklinde relative döndürür;
// cihaz relative URL açamayacağı için API origin'ine çevrilir.
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) {
    return '';
  }
  if (/^(https?:|data:|file:)/.test(url)) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${ENV.API_URL.replace(/\/$/, '')}${url}`;
  }
  return url;
}

export function resolveMobileAudience(
  user: Pick<User, 'isSeller'> | null | undefined,
  activeMode: RoleMode,
): MobileAudience {
  if (!user) {
    return MobileAudience.GUEST;
  }

  if (user.isSeller && activeMode === 'seller') {
    return MobileAudience.SELLER;
  }

  return MobileAudience.BUYER;
}

export function resolveLocalizedText(
  value: LocalizedText | undefined,
  locale: MobileLocale,
  fallback: string,
): string {
  return sharedResolveLocalizedText(value, locale, fallback);
}

export function isAudienceVisible(
  audiences: MobileAudience[],
  audience: MobileAudience,
): boolean {
  return audiences.includes(audience);
}

export function sortBlocksByOrder<T extends MobileConfigBlockBase>(items: T[]): T[] {
  return [...items].sort((left, right) => left.order - right.order);
}

export function getAudienceScopedProductCardConfig(
  config: MobileProductCardConfig,
  audience: MobileAudience,
): MobileProductCardConfig & MobileProductCardAudienceOverride {
  const override = config.audienceOverrides?.[audience];
  return {
    ...config,
    ...override,
  };
}

export function getAudienceScopedAuctionCardConfig(
  config: MobileAuctionListCardConfig,
  audience: MobileAudience,
): MobileAuctionListCardConfig & MobileAuctionListCardAudienceOverride {
  const override = config.audienceOverrides?.[audience];
  return {
    ...config,
    ...override,
  };
}
