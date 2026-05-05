import { ValueTransformer } from 'typeorm';

const toFiniteNumber = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error('Invalid decimal value');
  }
  return numeric;
};

/**
 * PostgreSQL numeric/decimal alanları pg driver tarafından string dönebilir.
 * Kolon scale'i 2 olduğu için DB'ye yazarken iki haneye yuvarlayıp,
 * okurken uygulama tarafında güvenli number tipine normalleştiriyoruz.
 */
export const decimalNumberTransformer: ValueTransformer = {
  to(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    return toFiniteNumber(value).toFixed(2);
  },
  from(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    return toFiniteNumber(value);
  },
};
