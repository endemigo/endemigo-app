import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuctionEvent } from '../modules/auction/entities/auction-event.entity';
import { Auction } from '../modules/auction/entities/auction.entity';
import { EntityManager } from 'typeorm';
import { AuctionStatus, AuctionEventStatus } from '@endemigo/shared';
import { AuctionGateway } from '../modules/auction/auction.gateway';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const em = app.get(EntityManager);
    const gateway = app.get(AuctionGateway);

    // Mock the websocket server to prevent undefined error
    const mockTo = {
      emit: () => {},
      fetchSockets: () => Promise.resolve([]),
    };
    gateway.server = {
      to: () => mockTo,
      emit: (event: string, data: any) => {
        console.log(`[Mock Socket Broadcast] Event: ${event}`, data);
      }
    } as any;

    const eventId = '1a619b5c-8fdf-4fa5-a334-b338184dea69';
    const firstLotId = 'f58f19e1-8cca-47fc-84ed-000673172c0e';
    const secondLotId = '29c156e0-8138-4c5f-9d70-30018bf82445';

    const event = await em.findOne(AuctionEvent, { where: { id: eventId } });
    if (!event) {
      console.error('Event not found!');
      return;
    }

    const firstLot = await em.findOne(Auction, { where: { id: firstLotId } });
    const secondLot = await em.findOne(Auction, { where: { id: secondLotId } });

    if (!firstLot || !secondLot) {
      console.error('Lots not found!');
      return;
    }

    // Set first lot to ended
    firstLot.status = AuctionStatus.ENDED;
    await em.save(firstLot);
    console.log(`Set first lot (${firstLot.id}) status to ENDED.`);

    // Set second lot to active
    const now = new Date();
    secondLot.status = AuctionStatus.ACTIVE;
    secondLot.startTime = now;
    secondLot.endTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes duration
    await em.save(secondLot);
    console.log(`Set second lot (${secondLot.id}) status to ACTIVE.`);

    // Update activeLotId on event
    event.activeLotId = secondLot.id;
    await em.save(event);
    console.log(`Updated event activeLotId to: ${secondLot.id}`);

    // Fetch product details for gateway emit
    const product = await em.findOne('Product', { where: { id: secondLot.productId } }) as any;

    // Trigger real broadcast by accessing the real server if possible, or just emit via the gateway emit method
    // Wait, the gateway in this standalone app has a mocked server, but we want the running dev server (port 3030 instance) to receive/emit the update.
    // Since we updated the database, the running dev server will read this from DB on reload. But to update current active clients immediately:
    // The running backend server polls or connects to redis, since RedisIoAdapter is used!
    // Wait, the NestJS RedisIoAdapter broadcasts messages. Our standalone script isn't connected to Redis pub/sub.
    // So the running server's socket clients won't get the socket emit immediately, but on page refresh they will see it.
    // Actually, does the running server listen to TypeORM subscribers or database changes? No.
    // But since the client page refetches details periodically or we can refresh, it will work.
    
    console.log('Database updated successfully! Transition complete.');

  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await app.close();
  }
}

run();
