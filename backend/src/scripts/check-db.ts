import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuctionEvent } from '../modules/auction/entities/auction-event.entity';
import { Auction } from '../modules/auction/entities/auction.entity';
import { EntityManager } from 'typeorm';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const em = app.get(EntityManager);

    const events = await em.find(AuctionEvent);
    console.log('--- EVENTS ---');
    for (const event of events) {
      console.log(`Event: ${event.title} (${event.id})`);
      console.log(`  Status: ${event.status}`);
      console.log(`  ActiveLotId: ${event.activeLotId}`);

      const lots = await em.find(Auction, {
        where: { eventId: event.id },
        order: { sequenceNumber: 'ASC' },
      });
      console.log('  Lots:');
      for (const lot of lots) {
        console.log(`    Lot ID: ${lot.id}`);
        console.log(`      Status: ${lot.status}`);
        console.log(`      Sequence: ${lot.sequenceNumber}`);
        console.log(`      ApprovalStatus: ${lot.approvalStatus}`);
        console.log(`      CurrentPrice: ${lot.currentPrice}`);
      }
    }
  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await app.close();
  }
}

run();
