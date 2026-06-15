import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EntityManager } from 'typeorm';
import { AuctionEvent } from '../modules/auction/entities/auction-event.entity';
import { Auction } from '../modules/auction/entities/auction.entity';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const em = app.get(EntityManager);
    const eventId = '1a619b5c-8fdf-4fa5-a334-b338184dea69';

    const event = await em.findOne(AuctionEvent, { where: { id: eventId } });
    console.log('\n--- Auction Event Status ---');
    console.log(`Event ID: ${event?.id}`);
    console.log(`Title: ${event?.title}`);
    console.log(`Status: ${event?.status}`);
    console.log(`Active Lot ID: ${event?.activeLotId}`);

    const lots = await em.find(Auction, { where: { eventId }, order: { sequenceNumber: 'ASC' } });
    console.log('\n--- Lots in Event ---');
    for (const lot of lots) {
      console.log(`Lot #${lot.lotNumber} (ID: ${lot.id})`);
      console.log(`  Status: ${lot.status}`);
      console.log(`  Sequence: ${lot.sequenceNumber}`);
      console.log(`  Start Price: ${lot.startPrice} | Current Price: ${lot.currentPrice}`);
      console.log(`  Bids Count: ${lot.bidCount}`);
      console.log(`  Start Time: ${lot.startTime?.toISOString()}`);
      console.log(`  End Time: ${lot.endTime?.toISOString()}`);
    }
    console.log('\n');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await app.close();
  }
}

run();
