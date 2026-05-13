export function parseTrMoneyInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.replace(/\s/g, '');
  const hasExplicitComma = normalized.includes(',');
  const sanitized = hasExplicitComma
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized.replace(/\D/g, '');
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeMoneyScale(value: number, scale = 2): number {
  return Number(value.toFixed(scale));
}

export function parseUnknownMoney(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return normalizeMoneyScale(value);
  }
  if (typeof value === 'string') {
    const parsed = parseTrMoneyInput(value);
    return parsed === undefined ? undefined : normalizeMoneyScale(parsed);
  }
  return undefined;
}
