export interface ProductImageUploadLimits {
  min: number;
  max: number;
}

export const DEFAULT_PRODUCT_IMAGE_UPLOAD_LIMITS: ProductImageUploadLimits = {
  min: 0,
  max: 10,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

export function sanitizeProductImageUploadLimits(
  value: unknown,
): ProductImageUploadLimits {
  if (!isRecord(value)) {
    return { ...DEFAULT_PRODUCT_IMAGE_UPLOAD_LIMITS };
  }

  const min = toInteger(value.min);
  const max = toInteger(value.max);
  if (min === null || max === null || min < 0 || max < 1 || min > max) {
    return { ...DEFAULT_PRODUCT_IMAGE_UPLOAD_LIMITS };
  }

  return { min, max };
}

export function validateProductImageUploadLimits(value: unknown): string[] {
  if (!isRecord(value)) {
    return ['Gorsel limiti nesne formatinda olmalidir'];
  }

  const min = toInteger(value.min);
  const max = toInteger(value.max);
  const errors: string[] = [];

  if (min === null) {
    errors.push('Min gorsel limiti tam sayi olmalidir');
  } else if (min < 0) {
    errors.push('Min gorsel limiti negatif olamaz');
  }

  if (max === null) {
    errors.push('Max gorsel limiti tam sayi olmalidir');
  } else if (max < 1) {
    errors.push('Max gorsel limiti en az 1 olmalidir');
  }

  if (min !== null && max !== null && min > max) {
    errors.push('Min gorsel limiti max limitten buyuk olamaz');
  }

  return errors;
}
