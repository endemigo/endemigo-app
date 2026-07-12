import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EntityManager } from 'typeorm';
import { Auction } from '../modules/auction/entities/auction.entity';
import { AuctionApprovalStatus, AuctionStatus } from '@endemigo/shared';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const em = app.get(EntityManager);
    const eventId = '1a619b5c-8fdf-4fa5-a334-b338184dea69';
    const currentSequence = 2;

    const nextLot = await em
      .getRepository(Auction)
      .createQueryBuilder('a')
      .where('a.eventId = :eventId', { eventId })
      .andWhere('a.approvalStatus = :status', {
        status: AuctionApprovalStatus.APPROVED,
      })
      .andWhere('a.sequenceNumber > :seq', { seq: currentSequence })
      .andWhere('a.status = :published', { published: AuctionStatus.PUBLISHED })
      .orderBy('a.sequenceNumber', 'ASC')
      .getOne();

    console.log('\n--- Next Lot Query Debug ---');
    console.log('Parameters:');
    console.log(`  eventId: ${eventId}`);
    console.log(`  approvalStatus: ${AuctionApprovalStatus.APPROVED}`);
    console.log(`  sequenceNumber > : ${currentSequence}`);
    console.log(`  status: ${AuctionStatus.PUBLISHED}`);
    console.log('Result:');
    if (nextLot) {
      console.log(`  Found Lot #${nextLot.lotNumber} (ID: ${nextLot.id})`);
      console.log(`  Status: ${nextLot.status}`);
      console.log(`  Sequence: ${nextLot.sequenceNumber}`);
      console.log(`  Approval Status: ${nextLot.approvalStatus}`);
    } else {
      console.log('  No next lot found!');
    }

    // Let's print all lots for this event to see their full properties
    const allLots = await em
      .getRepository(Auction)
      .find({ where: { eventId } });
    console.log('\n--- All Lots Properties ---');
    for (const lot of allLots) {
      console.log(`Lot #${lot.lotNumber}:`);
      console.log(`  ID: ${lot.id}`);
      console.log(`  status: ${lot.status}`);
      console.log(`  approvalStatus: ${lot.approvalStatus}`);
      console.log(`  sequenceNumber: ${lot.sequenceNumber}`);
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
