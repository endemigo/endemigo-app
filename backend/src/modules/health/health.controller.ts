import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RC } from '@endemigo/shared';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';
import { resolveRedisConnection } from '../../shared/config/redis.config';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Genel sağlık kontrolü' })
  check() {
    return {
      code: RC.SUCCESS,
      message: 'Health check başarılı',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('db')
  @ApiOperation({ summary: 'Veritabanı bağlantı kontrolü' })
  async dbCheck() {
    await this.dataSource.query('SELECT 1');
    return {
      code: RC.SUCCESS,
      message: 'Veritabanı bağlantısı sağlıklı',
      status: 'ok',
      db: 'connected',
    };
  }

  @Public()
  @Get('redis')
  @ApiOperation({ summary: 'Redis bağlantı kontrolü' })
  async redisCheck() {
    const redis = new Redis({
      ...resolveRedisConnection(this.configService),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    try {
      await redis.connect();
      await redis.ping();
      return {
        code: RC.SUCCESS,
        message: 'Redis bağlantısı sağlıklı',
        status: 'ok',
        redis: 'connected',
      };
    } catch {
      throw new ServiceUnavailableException({
        code: RC.INTERNAL_ERROR,
        message: 'Redis bağlantısı kurulamadı',
      });
    } finally {
      redis.disconnect();
    }
  }
}
