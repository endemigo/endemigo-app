import { isAxiosError } from 'axios';
import type { TFunction } from 'i18next';

interface ApiErrorPayload {
  code?: string;
  message?: string;
}

interface ApiErrorEnvelope extends ApiErrorPayload {
  error?: ApiErrorPayload;
}

export function resolveApiErrorMessage(
  error: unknown,
  t: TFunction,
  fallbackKey: string,
): string {
  const fallback = t(fallbackKey);

  if (!isAxiosError<ApiErrorEnvelope>(error)) {
    return fallback;
  }

  const responseData = error.response?.data;
  const payload =
    responseData?.error && typeof responseData.error === 'object'
      ? responseData.error
      : responseData;
  const fallbackMessage = payload?.message ?? fallback;

  if (!payload?.code) {
    return fallbackMessage;
  }

  return t(`api.${payload.code}`, { defaultValue: fallbackMessage });
}
