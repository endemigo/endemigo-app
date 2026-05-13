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

type MobileSentryModule = {
  init: (options: {
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

function resolveSentryModule(candidate: unknown): MobileSentryModule | null {
  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }
  const value = candidate as {
    init?: unknown;
    default?: { init?: unknown };
  };
  if (typeof value.init === 'function') {
    return { init: value.init as MobileSentryModule['init'] };
  }
  if (value.default && typeof value.default.init === 'function') {
    return { init: value.default.init as MobileSentryModule['init'] };
  }
  return null;
}

export async function initMobileMonitoring() {
  if (monitoringInitialized || !mobileMonitoringConfig.enabled) {
    return;
  }

  try {
    const moduleCandidate = await dynamicImport('@sentry/react-native');
    const sentry = resolveSentryModule(moduleCandidate);
    if (!sentry) {
      return;
    }

    sentry.init({
      dsn: mobileMonitoringConfig.dsn,
      environment: mobileMonitoringConfig.environment,
      release: mobileMonitoringConfig.release,
    });

    monitoringInitialized = true;
  } catch {
    // Sentry package is optional in local/dev installs.
  }
}
