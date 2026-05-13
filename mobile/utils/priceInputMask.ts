import { parseTrMoneyInput } from '../../shared-types/utils/money.ts';

function formatTurkishThousands(integerDigits: string): string {
  if (!integerDigits) return '';
  return integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatPriceInput(value: string): string {
  const rawValue = value.replace(/\s/g, '');
  if (!rawValue) return '';

  const onlyAllowedChars = rawValue.replace(/[^0-9.,]/g, '');
  if (!onlyAllowedChars) return '';

  const commaIndex = onlyAllowedChars.indexOf(',');
  const hasDecimalSeparator = commaIndex >= 0;
  const integerSource = hasDecimalSeparator
    ? onlyAllowedChars.slice(0, commaIndex)
    : onlyAllowedChars;
  const fractionSource = hasDecimalSeparator
    ? onlyAllowedChars.slice(commaIndex + 1)
    : '';

  // Dot is treated only as thousands separator input noise unless user explicitly enters comma.
  const integerDigitsRaw = integerSource.replace(/\D/g, '');
  const integerDigits = integerDigitsRaw.replace(/^0+(?=\d)/, '');
  const normalizedInteger = integerDigits || '0';
  const formattedInteger = formatTurkishThousands(normalizedInteger);

  if (!hasDecimalSeparator) {
    return formattedInteger;
  }

  const fractionDigits = fractionSource.replace(/\D/g, '').slice(0, 2);
  return `${formattedInteger},${fractionDigits}`;
}

export function parsePriceInput(value: string): number | undefined {
  return parseTrMoneyInput(value);
}
