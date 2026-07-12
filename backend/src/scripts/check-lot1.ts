import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EntityManager } from 'typeorm';
import { Auction } from '../modules/auction/entities/auction.entity';
import { AuctionEvent } from '../modules/auction/entities/auction-event.entity';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const em = app.get(EntityManager);
    const eventId = '1a619b5c-8fdf-4fa5-a334-b338184dea69';

    const event = await em.findOne(AuctionEvent, { where: { id: eventId } });
    console.log('\n--- Auction Event ---');
    console.log(`Event: ${event?.title} (Status: ${event?.status})`);
    console.log(`Active Lot ID: ${event?.activeLotId}`);

    const lots = await em.find(Auction, {
      where: { eventId },
      order: { sequenceNumber: 'ASC' },
    });
    console.log('\n--- Lots ---');
    for (const lot of lots) {
      console.log(
        `Lot #${lot.lotNumber} (Seq: ${lot.sequenceNumber}, Status: ${lot.status})`,
      );
      console.log(
        `  Current Price: ${lot.currentPrice} | Bids: ${lot.bidCount}`,
      );
      console.log(`  End Time: ${lot.endTime?.toISOString()}`);
      console.log(
        `  Time left (sec): ${lot.endTime ? Math.round((new Date(lot.endTime).getTime() - Date.now()) / 1000) : 'N/A'}`,
      );
    }
    console.log('\n');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await app.close();
  }
}

run();
