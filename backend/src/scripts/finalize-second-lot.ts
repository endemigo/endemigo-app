import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuctionService } from '../modules/auction/auction.service';
import { AuctionGateway } from '../modules/auction/auction.gateway';
import { EntityManager } from 'typeorm';
import { Auction } from '../modules/auction/entities/auction.entity';
import { AuctionStatus } from '@endemigo/shared';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const em = app.get(EntityManager);
    const service = app.get(AuctionService);
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

    const secondLotId = '29c156e0-8138-4c5f-9d70-30018bf82445';
    console.log(`Resetting second lot (${secondLotId}) to ACTIVE...`);
    
    const secondLot = await em.findOne(Auction, { where: { id: secondLotId } });
    if (secondLot) {
      secondLot.status = AuctionStatus.ACTIVE;
      await em.save(secondLot);
      console.log('Lot 2 is ACTIVE again.');
    }

    console.log(`Finalizing second lot (${secondLotId})...`);
    await service.finalizeAuction(secondLotId);
    console.log('Second lot finalized and transitioned successfully!');
  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await app.close();
  }
}

run();
