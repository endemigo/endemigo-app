import { normalizeMoneyScale } from '../../shared-types/utils/money.ts';
import { parsePriceInput } from './priceInputMask.ts';

// Onay öncesi odaklı düzenleme — wizard'ın ~60 alanı yerine yalnız yüksek
// değerli ürün alanları ve (lot varsa) fiyat alanları.
export interface ProductEditFormState {
  title: string;
  description: string;
  price: string; // para girişi (maskeli string)
}

export interface LotEditFormState {
  startPrice: string;
  reservePrice: string;
  minIncrement: string;
}

export interface ProductUpdatePayload {
  title?: string;
  description?: string;
  price?: number;
}

export interface LotUpdatePayload {
  startPrice?: number;
  reservePrice?: number | null;
  minIncrement?: number;
}

function toMoney(value: string): number | undefined {
  const parsed = parsePriceInput(value);
  return parsed !== undefined && parsed > 0 ? normalizeMoneyScale(parsed) : undefined;
}

export function buildProductUpdatePayload(form: ProductEditFormState): ProductUpdatePayload {
  return {
    title: form.title.trim() || undefined,
    description: form.description.trim() || undefined,
    price: toMoney(form.price),
  };
}

export function buildLotUpdatePayload(form: LotEditFormState): LotUpdatePayload {
  const startPrice = toMoney(form.startPrice);
  const minIncrement = toMoney(form.minIncrement);
  // Rezerv boş bırakılırsa kaldırma niyeti → null gönderilir.
  const reserveParsed = parsePriceInput(form.reservePrice);
  const reservePrice =
    reserveParsed !== undefined && reserveParsed > 0 ? normalizeMoneyScale(reserveParsed) : null;

  return {
    ...(startPrice !== undefined ? { startPrice } : {}),
    ...(minIncrement !== undefined ? { minIncrement } : {}),
    reservePrice,
  };
}
