import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuctionEvent } from '../modules/auction/entities/auction-event.entity';
import { Auction } from '../modules/auction/entities/auction.entity';
import { Bid } from '../modules/auction/entities/bid.entity';
import { AuctionGateway } from '../modules/auction/auction.gateway';
import { EntityManager } from 'typeorm';
import { AuctionStatus, AuctionEventStatus, AuctionPaymentStatus } from '@endemigo/shared';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const em = app.get(EntityManager);
    const gateway = app.get(AuctionGateway);
    
    // Get the BullMQ queue using getQueueToken
    const queue = app.get(getQueueToken('auction')) as Queue;

    const eventId = '1a619b5c-8fdf-4fa5-a334-b338184dea69';
    const lot1Id = '29c156e0-8138-4c5f-9d70-30018bf82445'; // Sequence 1 (Lot #LOT-202606-00002)
    const lot2Id = 'f58f19e1-8cca-47fc-84ed-000673172c0e'; // Sequence 2 (Lot #LOT-202606-00001)
    const lot3Id = '7366e6ea-c0e4-40ec-b921-319bfd8547f9'; // Sequence 3 (Lot #LOT-202606-00003)
    const lotIds = [lot1Id, lot2Id, lot3Id];

    console.log(`Resetting auction event: ${eventId}`);

    // Mock socket gateway to prevent crash
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

    // 1. Delete all bids for these lots
    await em.createQueryBuilder()
      .delete()
      .from(Bid)
      .where('auctionId IN (:...lotIds)', { lotIds })
      .execute();
    console.log('Cleared all bids.');

    // 2. Delete/Release all wallet holds for these lots
    await em.createQueryBuilder()
      .delete()
      .from('wallet_holds')
      .where('auctionId IN (:...lotIds)', { lotIds })
      .execute();
    console.log('Cleared all wallet holds.');

    // 3. Reset Event
    const event = await em.findOne(AuctionEvent, { where: { id: eventId } });
    if (event) {
      event.status = AuctionEventStatus.ACTIVE;
      event.activeLotId = lot1Id;
      // Event bitiş tarihini geleceğe (2 saat sonraya) çekerek listenin "bitti" görmesini engelliyoruz
      event.endTime = new Date(Date.now() + 2 * 60 * 60 * 1000); 
      await em.save(event);
      console.log('Reset auction event status to ACTIVE with Lot 1 as active and endTime extended.');
    }

    // 4. Reset Lot 1 (Set Active for 5 minutes)
    const now = new Date();
    const endTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes duration
    
    const lot1 = await em.findOne(Auction, { where: { id: lot1Id } });
    if (lot1) {
      lot1.status = AuctionStatus.ACTIVE;
      lot1.startTime = now;
      lot1.endTime = endTime;
      lot1.currentPrice = lot1.startPrice;
      lot1.bidCount = 0;
      lot1.winnerId = null;
      lot1.winningBidId = null;
      lot1.winnerPaymentStatus = AuctionPaymentStatus.NONE;
      lot1.winnerPaymentDeadlineAt = null;
      lot1.winnerPaymentCompletedAt = null;
      lot1.reserveMet = false;
      lot1.currentExtensions = 0;
      await em.save(lot1);
      console.log('Lot 1 reset and set to ACTIVE for 5 minutes.');
    }

    // 5. Reset Lot 2 and Lot 3
    for (const lotId of [lot2Id, lot3Id]) {
      const lot = await em.findOne(Auction, { where: { id: lotId } });
      if (lot) {
        lot.status = AuctionStatus.PUBLISHED;
        lot.startTime = now;
        lot.endTime = endTime;
        lot.currentPrice = lot.startPrice;
        lot.bidCount = 0;
        lot.winnerId = null;
        lot.winningBidId = null;
        lot.winnerPaymentStatus = AuctionPaymentStatus.NONE;
        lot.winnerPaymentDeadlineAt = null;
        lot.winnerPaymentCompletedAt = null;
        lot.reserveMet = false;
        lot.currentExtensions = 0;
        await em.save(lot);
        console.log(`Lot #${lot.lotNumber} reset and set to PUBLISHED.`);
      }
    }

    // 6. Clean BullMQ jobs for these lots
    console.log('Cleaning BullMQ jobs...');
    for (const id of lotIds) {
      try {
        const job = await queue.getJob(`end-${id}`);
        if (job) await job.remove();
      } catch {}
      for (let ext = 1; ext <= 10; ext++) {
        try {
          const job = await queue.getJob(`end-${id}-ext${ext}`);
          if (job) await job.remove();
        } catch {}
      }
      for (let r = 0; r <= 3; r++) {
        try {
          const job1 = await queue.getJob(`winner-payment-expiry-${id}-r${r}`);
          if (job1) await job1.remove();
          const job2 = await queue.getJob(`winner-payment-reminder-${id}-r${r}`);
          if (job2) await job2.remove();
        } catch {}
      }
    }

    // 7. Schedule BullMQ job for Lot 1
    const delay = endTime.getTime() - Date.now();
    await queue.add(
      'end-auction',
      { auctionId: lot1Id },
      { delay: Math.max(0, delay), jobId: `end-${lot1Id}` }
    );
    console.log(`Scheduled end-auction job for Lot 1 in BullMQ with ${Math.round(delay / 1000)} seconds delay.`);

    // 8. Broadcast to WebSocket
    const product = await em.findOne('Product', { where: { id: lot1?.productId } }) as any;
    gateway.emitActiveLotChanged(eventId, {
      activeLotId: lot1Id,
      lotNumber: lot1?.lotNumber || null,
      productTitle: product?.title ?? null,
      currentPrice: Number(lot1?.startPrice || 0),
      endTime: endTime.toISOString(),
    });
    gateway.emitEventStatusChanged(eventId, { status: AuctionEventStatus.ACTIVE });

    console.log('Auction reset and initialized successfully!');
  } catch (err) {
    console.error('Error running reset script:', err);
  } finally {
    await app.close();
  }
}

run();
