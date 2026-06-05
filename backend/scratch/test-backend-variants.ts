import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AdminOperationsService } from '../src/modules/admin-operations/admin-operations.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(AdminOperationsService);
  
  try {
    const res = await service.listVariantNumbers({ page: '1', limit: '200' });
    console.log('listVariantNumbers result length:', res.items.length);
    console.log('listVariantNumbers result sample:', JSON.stringify(res.items.slice(0, 3), null, 2));
  } catch (err) {
    console.error('Failed to list variant numbers:', err);
  } finally {
    await app.close();
  }
}

main();
