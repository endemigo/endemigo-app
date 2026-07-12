import { parsePriceInput } from './priceInputMask.ts';

// Müzayede lot fiyat kuralları — backend CreateAuctionDto ile hizalı TEK kaynak.
// Hem ApplyToEventSheet (mevcut üründen ekleme) hem ProductCreateWizard (yeni ürün
// müzayede) buradan doğrular; kurallar iki yerde ayrışmasın.
//   - startPrice: @Min(1)
//   - reservePrice: açılış fiyatından düşük olamaz (applyToEvent/bulkImportLots)
export const MIN_LOT_START_PRICE = 1;

export interface LotPriceCheck {
  startValue: number;
  reserveValue: number | null;
  startValid: boolean;
  reserveBelowStart: boolean;
}

export function checkLotPrices(startPrice: string, reservePrice?: string): LotPriceCheck {
  const startValue = parsePriceInput(startPrice) ?? 0;
  const reserveValue =
    reservePrice && reservePrice.trim() ? parsePriceInput(reservePrice) ?? 0 : null;
  return {
    startValue,
    reserveValue,
    startValid: startValue >= MIN_LOT_START_PRICE,
    reserveBelowStart: reserveValue !== null && reserveValue < startValue,
  };
}
