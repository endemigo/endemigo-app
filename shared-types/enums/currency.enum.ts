export enum Currency {
  TRY = 'TRY',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  Currency.TRY,
  Currency.USD,
  Currency.EUR,
  Currency.GBP,
];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  [Currency.TRY]: '₺',
  [Currency.USD]: '$',
  [Currency.EUR]: '€',
  [Currency.GBP]: '£',
};
