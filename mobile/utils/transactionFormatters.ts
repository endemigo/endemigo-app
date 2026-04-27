type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
      code?: string;
    };
  };
  message?: string;
};

export function formatCurrency(amount: number, currency = 'TRY') {
  const normalized = Number.isFinite(amount) ? amount : 0;
  const formatted = normalized.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === 'TRY' ? `₺${formatted}` : `${formatted} ${currency}`;
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
