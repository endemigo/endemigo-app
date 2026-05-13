import { Logger } from '@nestjs/common';
import {
  backendMonitoringConfig,
  type BackendMonitoringConfig,
} from './monitoring.config';

type SentryNodeLike = {
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

let initialized = false;

function resolveSentryModule(candidate: unknown): SentryNodeLike | null {
  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }
  const value = candidate as {
    init?: unknown;
    default?: { init?: unknown };
  };
  if (typeof value.init === 'function') {
    return { init: value.init as SentryNodeLike['init'] };
  }
  if (value.default && typeof value.default.init === 'function') {
    return { init: value.default.init as SentryNodeLike['init'] };
  }
  return null;
}

export async function initBackendMonitoring(
  config: BackendMonitoringConfig = backendMonitoringConfig,
): Promise<void> {
  if (initialized || !config.enabled) {
    return;
  }

  const logger = new Logger('Monitoring');

  try {
    const moduleCandidate = await dynamicImport('@sentry/node');
    const sentry = resolveSentryModule(moduleCandidate);
    if (!sentry) {
      logger.warn('Sentry module found but init() is unavailable');
      return;
    }

    sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
    });

    initialized = true;
    logger.log(`Sentry initialized (${config.environment})`);
  } catch {
    logger.warn('Sentry package is not installed; monitoring init skipped');
  }
}
