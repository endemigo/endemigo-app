import { ConfigService } from '@nestjs/config';

export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  tls?: Record<string, never>;
}

/**
 * Tek Redis bağlantı çözümleyici: REDIS_URL öncelikli, yoksa
 * REDIS_HOST/REDIS_PORT/REDIS_PASSWORD. BullMQ, socket.io adapter ve
 * health check aynı Redis'e bakmak zorunda — config burada tekilleşir.
 */
export function resolveRedisConnection(
  configService: ConfigService,
): RedisConnectionOptions {
  const redisUrl = configService.get<string>('REDIS_URL');
  if (redisUrl) {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      password:
        (url.password ? decodeURIComponent(url.password) : undefined) ||
        configService.get<string>('REDIS_PASSWORD') ||
        undefined,
      ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    };
  }
  return {
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: Number(configService.get<string | number>('REDIS_PORT', 6379)),
    password: configService.get<string>('REDIS_PASSWORD') || undefined,
  };
}

export function resolveRedisUrl(configService: ConfigService): string {
  const redisUrl = configService.get<string>('REDIS_URL');
  if (redisUrl) return redisUrl;
  const { host, port, password } = resolveRedisConnection(configService);
  const auth = password ? `:${encodeURIComponent(password)}@` : '';
  return `redis://${auth}${host}:${port}`;
}
