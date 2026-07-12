export interface BackendMonitoringConfig {
  provider: 'sentry';
  dsn?: string;
  environment: string;
  release?: string;
  alertWebhookUrl?: string;
  enabled: boolean;
  alertsConfigured: boolean;
}

export function getBackendMonitoringConfig(
  env: NodeJS.ProcessEnv = process.env,
): BackendMonitoringConfig {
  const dsn = env.SENTRY_DSN;
  const alertWebhookUrl = env.SENTRY_ALERT_WEBHOOK_URL;

  return {
    provider: 'sentry',
    dsn,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV ?? 'development',
    release: env.SENTRY_RELEASE,
    alertWebhookUrl,
    enabled: Boolean(dsn),
    alertsConfigured: Boolean(alertWebhookUrl),
  };
}

export const backendMonitoringConfig = getBackendMonitoringConfig();
