import type { TFunction } from 'i18next';
import { ProductCondition } from '@endemigo/shared';

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
