import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Genel sağlık kontrolü' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('db')
  @ApiOperation({ summary: 'Veritabanı bağlantı kontrolü' })
  async dbCheck() {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', db: 'connected' };
  }
}
