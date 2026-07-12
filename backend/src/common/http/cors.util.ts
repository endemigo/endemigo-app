import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const DEV_ALLOWED_ORIGINS = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
];

function parseConfiguredOrigins(corsOrigin?: string): string[] {
  if (!corsOrigin) return [];

  return corsOrigin
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getAllowedCorsOrigins(
  nodeEnv = process.env.NODE_ENV,
  corsOrigin = process.env.CORS_ORIGIN,
): string[] {
  const configuredOrigins = parseConfiguredOrigins(corsOrigin);
  if (nodeEnv === 'production') {
    return configuredOrigins;
  }

  return [...new Set([...DEV_ALLOWED_ORIGINS, ...configuredOrigins])];
}

export function buildCorsOptions(
  nodeEnv = process.env.NODE_ENV,
  corsOrigin = process.env.CORS_ORIGIN,
): CorsOptions {
  const allowedOrigins = getAllowedCorsOrigins(nodeEnv, corsOrigin);

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes('*')) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
  };
}
