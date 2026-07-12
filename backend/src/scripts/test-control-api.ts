import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AdminOperationsController } from '../modules/admin-operations/admin-operations.controller';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const controller = app.get(AdminOperationsController);
    const eventId = '1a619b5c-8fdf-4fa5-a334-b338184dea69';

    // Mock socket gateway to prevent crash
    const { AuctionGateway } = require('../modules/auction/auction.gateway');
    const gateway = app.get(AuctionGateway);
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

    console.log('--- TESTING PAUSE AND RESUME CONTROL BUTTONS ---');

    console.log('1. Testing pauseAuction...');
    try {
      const res = await controller.pauseAuction(eventId);
      console.log('pauseAuction result:', res);
    } catch (err: any) {
      console.error('pauseAuction failed with error:', err.response || err);
    }

    console.log('\n2. Testing resumeAuction...');
    try {
      const res = await controller.resumeAuction(eventId);
      console.log('resumeAuction result:', res);
    } catch (err: any) {
      console.error('resumeAuction failed with error:', err.response || err);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await app.close();
  }
}

run();
