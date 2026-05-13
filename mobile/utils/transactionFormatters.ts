type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
      code?: string;
    };
  };
  message?: string;
};

export function formatCurrency(amount: number | string | null | undefined, currency = 'TRY') {
  const normalized = normalizeAmount(amount);
  const formatted = normalized.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === 'TRY' ? `₺${formatted}` : `${formatted} ${currency}`;
}

export function formatAmount(value: number | string | null | undefined) {
  return normalizeAmount(value).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeAmount(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : 0;
  }
  return 0;
}

export function formatShortDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatShortDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.message ?? apiError.message ?? fallback;
  }
  return fallback;
}
