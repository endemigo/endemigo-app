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

type AdminSentryModule = {
  init: (options: {
    app: unknown;
    dsn?: string;
    environment?: string;
    release?: string;
  }) => void;
};

const dynamicImport = new Function(
  'moduleName',
  'return import(moduleName)',
) as (moduleName: string) => Promise<unknown>;

let monitoringInitialized = false;

function resolveSentryModule(candidate: unknown): AdminSentryModule | null {
  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }
  const value = candidate as {
    init?: unknown;
    default?: { init?: unknown };
  };
  if (typeof value.init === 'function') {
    return { init: value.init as AdminSentryModule['init'] };
  }
  if (value.default && typeof value.default.init === 'function') {
    return { init: value.default.init as AdminSentryModule['init'] };
  }
  return null;
}

export async function initAdminMonitoring(app: unknown) {
  if (monitoringInitialized || !adminMonitoringConfig.enabled) {
    return;
  }

  try {
    const moduleCandidate = await dynamicImport('@sentry/vue');
    const sentry = resolveSentryModule(moduleCandidate);
    if (!sentry) {
      return;
    }

    sentry.init({
      app,
      dsn: adminMonitoringConfig.dsn,
      environment: adminMonitoringConfig.environment,
      release: adminMonitoringConfig.release,
    });

    monitoringInitialized = true;
  } catch {
    // Sentry package is optional in local/dev installs.
  }
}
