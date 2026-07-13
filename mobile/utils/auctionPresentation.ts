import type { TFunction } from 'i18next';
import { ProductCondition } from '@endemigo/shared';
import { formatCurrency } from './transactionFormatters';

// Tahmini değer aralığı metni (müzayede ekspertizi). İkisi de boşsa null döner;
// tek sınır varsa yalnız onu, ikisi varsa "alt – üst" biçiminde gösterir.
export function formatEstimateRange(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string,
): string | null {
  const hasMin = typeof min === 'number' && min > 0;
  const hasMax = typeof max === 'number' && max > 0;
  if (!hasMin && !hasMax) return null;
  if (hasMin && hasMax) {
    return `${formatCurrency(min, currency)} – ${formatCurrency(max, currency)}`;
  }
  return formatCurrency((hasMin ? min : max) as number, currency);
}

export function getAuctionTypeLabel(
  auctionType: string | undefined,
  t: TFunction,
) {
  return auctionType === 'TIMED'
    ? t('auction.auctionTypeTimed')
    : t('auction.auctionTypeRealtime');
}

export function getAuctionConditionLabel(
  condition: ProductCondition | undefined,
  t: TFunction,
) {
  switch (condition) {
    case ProductCondition.NEW:
      return t('auction.conditionNew');
    case ProductCondition.EXCELLENT:
      return t('auction.conditionExcellent');
    case ProductCondition.VERY_GOOD:
      return t('auction.conditionVeryGood');
    case ProductCondition.GOOD:
      return t('auction.conditionGood');
    default:
      return t('auction.conditionUnknown');
  }
}

export function getAuctionStatusLabel(
  isActive: boolean,
  isEnded: boolean,
  t: TFunction,
) {
  if (isActive) return t('auction.live');
  if (isEnded) return t('auction.auctionEnded');
  return t('auction.startsSoon');
}

export function getAuctionStatusTone(isActive: boolean, isEnded: boolean) {
  if (isActive) return 'active';
  if (isEnded) return 'ended';
  return 'scheduled';
}
