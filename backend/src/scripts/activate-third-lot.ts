import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuctionService } from '../modules/auction/auction.service';
import { AuctionGateway } from '../modules/auction/auction.gateway';
import { EntityManager } from 'typeorm';
import { Auction } from '../modules/auction/entities/auction.entity';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const em = app.get(EntityManager);
    const service = app.get(AuctionService);
    const gateway = app.get(AuctionGateway);

    // Mock the websocket server to prevent undefined error during script run
    const mockTo = {
      emit: () => {},
      fetchSockets: () => Promise.resolve([]),
    };
    gateway.server = {
      to: () => mockTo,
      emit: (event: string, data: any) => {
        console.log(`[Mock Socket Broadcast] Event: ${event}`, data);
      },
    } as any;

    const secondLotId = '29c156e0-8138-4c5f-9d70-30018bf82445';
    const secondLot = await em.findOne(Auction, { where: { id: secondLotId } });
    if (!secondLot) {
      console.error('Second lot not found!');
      return;
    }

    console.log(
      `Executing handleSequentialLotProgression for lot #${secondLot.lotNumber}...`,
    );
    await service.handleSequentialLotProgression(secondLot);
    console.log('Transition to Lot 3 completed and scheduled successfully!');
  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await app.close();
  }
}

run();
