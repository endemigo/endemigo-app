import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EntityManager } from 'typeorm';
import { Auction } from '../modules/auction/entities/auction.entity';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const em = app.get(EntityManager);
    const eventId = '1a619b5c-8fdf-4fa5-a334-b338184dea69';
    const lots = await em.find(Auction, { where: { eventId } });
    console.log('\n--- Lots Auction Type Check ---');
    for (const lot of lots) {
      console.log(`Lot #${lot.lotNumber} (ID: ${lot.id}):`);
      console.log(`  auctionType: ${lot.auctionType}`);
      console.log(`  status: ${lot.status}`);
      console.log(`  eventId: ${lot.eventId}`);
    }
    console.log('\n');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await app.close();
  }
}

run();
