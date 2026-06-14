import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuctionService } from '../modules/auction/auction.service';
import { AuctionEvent } from '../modules/auction/entities/auction-event.entity';
import { EntityManager, Not, IsNull } from 'typeorm';
import { AuctionEventStatus } from '@endemigo/shared';
import { AuctionGateway } from '../modules/auction/auction.gateway';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const em = app.get(EntityManager);
    const auctionService = app.get(AuctionService);
    const gateway = app.get(AuctionGateway);

    // Mock the websocket server to prevent "Cannot read properties of undefined (reading 'to')"
    const mockTo = {
      emit: () => {},
      fetchSockets: () => Promise.resolve([]),
    };
    gateway.server = {
      to: () => mockTo,
    } as any;
    
    // Find active event that has an active lot
    const event = await em.findOne(AuctionEvent, {
      where: {
        status: AuctionEventStatus.ACTIVE,
        activeLotId: Not(IsNull()),
      },
    });
    
    if (!event) {
      console.error('No active event with an active lot found!');
      return;
    }

    console.log(`Using event: ${event.title} (${event.id}), activeLotId: ${event.activeLotId}`);
    console.log(`Skipping active lot: ${event.activeLotId}`);
    
    const res = await auctionService.skipLot(event.id);
    console.log('Skip result:', res);

  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await app.close();
  }
}

run();
