import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Server, ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private pubClient?: any;
  private subClient?: any;

  constructor(
    app: INestApplicationContext,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL')
      || `redis://${this.configService.get<string>('REDIS_HOST', 'localhost')}:${this.configService.get<number>('REDIS_PORT', 6379)}`;

    try {
      this.pubClient = createClient({ url: redisUrl });
      this.subClient = this.pubClient.duplicate();

      await Promise.all([
        this.pubClient.connect(),
        this.subClient.connect(),
      ]);

      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
      this.logger.log(`Socket.IO Redis adapter initialized (${redisUrl})`);
    } catch (error) {
      this.adapterConstructor = undefined;
      this.logger.warn(
        'Socket.IO Redis adapter unavailable — using in-memory adapter',
        error instanceof Error ? error.stack : String(error),
      );
      await this.disconnectRedisClients();
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server: Server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  async close(server: any) {
    if (server && typeof server.close === 'function') {
      server.close();
    }
    await this.disconnectRedisClients();
  }

  private async disconnectRedisClients() {
    await Promise.allSettled([
      this.pubClient?.quit(),
      this.subClient?.quit(),
    ]);
    this.pubClient = undefined;
    this.subClient = undefined;
  }
}
