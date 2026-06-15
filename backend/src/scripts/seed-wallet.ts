import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EntityManager } from 'typeorm';
import { Wallet } from '../modules/wallet/entities/wallet.entity';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const em = app.get(EntityManager);
    // Tüm cüzdanların bakiyesini 1.000.000 TL yapalım
    await em.createQueryBuilder()
      .update(Wallet)
      .set({ balance: 1000000 })
      .execute();
    console.log('All wallets seeded with 1,000,000 TRY successfully.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await app.close();
  }
}

run();
