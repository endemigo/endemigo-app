export interface MobileMonitoringConfig {
  provider: 'sentry';
  dsn?: string;
  environment: string;
  release?: string;
  enabled: boolean;
}

type MobileMonitoringEnv = Record<string, string | undefined>;

export function getMobileMonitoringConfig(env: MobileMonitoringEnv = process.env): MobileMonitoringConfig {
  const dsn = env.EXPO_PUBLIC_SENTRY_DSN;

  return {
    provider: 'sentry',
    dsn,
    environment: env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? env.NODE_ENV ?? 'development',
    release: env.EXPO_PUBLIC_SENTRY_RELEASE,
    enabled: Boolean(dsn),
  };
}

export const mobileMonitoringConfig = getMobileMonitoringConfig();
