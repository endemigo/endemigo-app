export interface AdminMonitoringConfig {
  provider: 'sentry';
  dsn?: string;
  environment: string;
  release?: string;
  enabled: boolean;
}

type AdminMonitoringEnv = Record<string, string | boolean | undefined> & {
  MODE?: string;
};

export function getAdminMonitoringConfig(
  env: AdminMonitoringEnv = import.meta.env as AdminMonitoringEnv,
): AdminMonitoringConfig {
  const dsn = typeof env.VITE_SENTRY_DSN === 'string' ? env.VITE_SENTRY_DSN : undefined;
  const environment =
    typeof env.VITE_SENTRY_ENVIRONMENT === 'string'
      ? env.VITE_SENTRY_ENVIRONMENT
      : typeof env.MODE === 'string'
        ? env.MODE
        : 'development';

  return {
    provider: 'sentry',
    dsn,
    environment,
    release: typeof env.VITE_SENTRY_RELEASE === 'string' ? env.VITE_SENTRY_RELEASE : undefined,
    enabled: Boolean(dsn),
  };
}

export const adminMonitoringConfig = getAdminMonitoringConfig();
