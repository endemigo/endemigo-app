import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuctionEvent } from '../modules/auction/entities/auction-event.entity';
import { Auction } from '../modules/auction/entities/auction.entity';
import { Bid } from '../modules/auction/entities/bid.entity';
import { Product } from '../modules/product/entities/product.entity';
import { Category } from '../modules/product/entities/category.entity';
import { User } from '../modules/user/entities/user.entity';
import { AuctionRegistration } from '../modules/auction/entities/auction-registration.entity';
import { EntityManager } from 'typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { 
  AuctionStatus, 
  AuctionEventStatus, 
  AuctionPaymentStatus, 
  AuctionType, 
  AuctionApprovalStatus, 
  ProductStatus, 
  ListingType, 
  ProductCondition 
} from '@endemigo/shared';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const em = app.get(EntityManager);
    const queue = app.get(getQueueToken('auction')) as Queue;

    console.log('Starting seed-3-auctions database prep...');

    // 1. Fetch any user to act as seller (ideally an active seller, but any user will do)
    const seller = await em.findOne(User, { where: {} });
    if (!seller) {
      throw new Error('No user found in database to act as seller. Please seed users first.');
    }
    console.log(`Using seller: ${seller.email} (${seller.id})`);

    // 2. Fetch or create a category
    let category = await em.findOne(Category, { where: {} });
    if (!category) {
      category = em.create(Category, {
        name: 'Genel',
        nameEn: 'General',
        code: 'GENERAL',
        isActive: true,
      });
      await em.save(category);
      console.log('Created general category.');
    } else {
      console.log(`Using category: ${category.name} (${category.id})`);
    }

    // Fetch all old auctions to get their IDs for cleaning BullMQ jobs
    const oldAuctions = await em.find(Auction);
    const oldAuctionIds = oldAuctions.map(a => a.id);

    // 3. Clear existing auction-related data
    console.log('Clearing old bids...');
    await em.createQueryBuilder().delete().from(Bid).execute();

    console.log('Clearing old wallet holds...');
    await em.createQueryBuilder().delete().from('wallet_holds').execute();

    console.log('Clearing old auction registrations...');
    await em.createQueryBuilder().delete().from(AuctionRegistration).execute();

    console.log('Clearing old auctions...');
    await em.createQueryBuilder().delete().from(Auction).execute();

    console.log('Clearing old auction events...');
    await em.createQueryBuilder().delete().from(AuctionEvent).execute();

    // 4. Create 30 different products
    console.log('Creating 30 new products for the auctions...');
    const products: Product[] = [];
    for (let i = 1; i <= 30; i++) {
      const product = em.create(Product, {
        title: `Seeded Ürün ${i}`,
        description: `Bu ${i} numaralı seeded üründür. Harika kondisyonda, nadide bir parçadır.`,
        price: 5000 + i * 500,
        status: ProductStatus.ACTIVE,
        listingType: ListingType.AUCTION,
        sellerId: seller.id,
        categoryId: category.id,
        imageUrl: `https://picsum.photos/id/${10 + i}/600/400`,
        stockQuantity: 1,
        condition: ProductCondition.NEW,
        originCountry: 'TR',
      });
      products.push(product);
    }
    await em.save(products);
    console.log(`Inserted ${products.length} products.`);

    // 5. Create 3 Auction Events
    const now = new Date();
    const event1Start = new Date(now.getTime() - 5 * 60 * 1000); // started 5 mins ago
    const event1End = new Date(now.getTime() + 2 * 60 * 60 * 1000); // ends in 2 hours

    const event2Start = new Date(now.getTime() + 60 * 60 * 1000); // starts in 1 hour
    const event2End = new Date(now.getTime() + 3 * 60 * 60 * 1000); // ends in 3 hours

    const event3Start = new Date(now.getTime() + 24 * 60 * 60 * 1000); // starts tomorrow (24 hours)
    const event3End = new Date(now.getTime() + 28 * 60 * 60 * 1000); // ends in 28 hours

    const eventsData = [
      {
        title: 'Canlı Antika ve Efemera Müzayedesi',
        description: 'Bu şu anda devam etmekte olan canlı müzayedemizdir. Harika antika saatler, nadir paralar ve efemeralar bu müzayedede yer almaktadır.',
        status: AuctionEventStatus.ACTIVE,
        startTime: event1Start,
        endTime: event1End,
      },
      {
        title: 'Nadir Kitaplar ve İmzalı Özel Baskılar Müzayedesi',
        description: 'Yaklaşık 1 saat sonra başlayacak olan bu müzayedede Cumhuriyet dönemi imzalı baskılar ve nadir koleksiyon kitapları yer almaktadır.',
        status: AuctionEventStatus.UPCOMING,
        startTime: event2Start,
        endTime: event2End,
      },
      {
        title: 'Anadolu Kilimleri ve Klasik Halılar Müzayedesi',
        description: 'Yarın başlayacak olan bu müzayedede asırlık el dokuması Anadolu kilimleri ve ipek Hereke halıları satışa sunulacaktır.',
        status: AuctionEventStatus.UPCOMING,
        startTime: event3Start,
        endTime: event3End,
      }
    ];

    const events: AuctionEvent[] = [];
    for (const data of eventsData) {
      const event = em.create(AuctionEvent, {
        title: data.title,
        description: data.description,
        status: data.status,
        startTime: data.startTime,
        endTime: data.endTime,
        auctionType: AuctionType.REALTIME,
        categoryId: category.id,
        coverImageUrl: 'https://picsum.photos/id/24/1200/600',
        antiSnipingEnabled: true,
        maxExtensions: 5,
        extensionSeconds: 60,
        extensionDuration: 60,
        lotTransitionSeconds: 15,
      });
      events.push(event);
    }
    await em.save(events);
    console.log(`Inserted 3 auction events.`);

    // 6. Create 10 lots for each event
    const auctions: Auction[] = [];
    
    for (let eventIdx = 0; eventIdx < 3; eventIdx++) {
      const event = events[eventIdx];
      console.log(`Generating 10 lots for Event: ${event.title}`);

      for (let lotIdx = 0; lotIdx < 10; lotIdx++) {
        const productIdx = eventIdx * 10 + lotIdx;
        const product = products[productIdx];
        const sequenceNumber = lotIdx + 1;
        const isEvent1 = eventIdx === 0;

        let status = AuctionStatus.PUBLISHED;
        let startTime = event.startTime;
        let endTime = event.endTime;

        if (isEvent1) {
          if (lotIdx === 0) {
            // Lot 1 is Active
            status = AuctionStatus.ACTIVE;
            startTime = event.startTime;
            endTime = new Date(now.getTime() + 10 * 60 * 1000); // active for next 10 mins
          } else {
            // Other lots in live auction are published
            status = AuctionStatus.PUBLISHED;
          }
        }

        // Set some required deposits to test entry deposits
        // Event 1, Lot 2 (Index 1) -> 250 TL deposit
        // Event 1, Lot 3 (Index 2) -> 500 TL deposit
        let requiredDeposit = 0;
        if (isEvent1) {
          if (lotIdx === 1) requiredDeposit = 250;
          if (lotIdx === 2) requiredDeposit = 500;
        }

        const auction = em.create(Auction, {
          eventId: event.id,
          productId: product.id,
          sellerId: seller.id,
          sequenceNumber,
          lotNumber: `LOT-202606-${eventIdx + 1}000${sequenceNumber}`,
          startPrice: 1000 * sequenceNumber,
          currentPrice: 1000 * sequenceNumber,
          minIncrement: 100,
          status,
          startTime,
          endTime,
          approvalStatus: AuctionApprovalStatus.APPROVED,
          requiredDeposit,
          roomCapacity: 100,
          antiSnipingEnabled: true,
          maxExtensions: 10,
          extensionSeconds: 60,
          extensionDuration: 60,
        });

        auctions.push(auction);
      }
    }

    await em.save(auctions);
    console.log(`Inserted ${auctions.length} lots.`);

    // 7. Update active lot of Event 1 (Live) to Lot 1
    const event1 = events[0];
    const lot1 = auctions.find(a => a.eventId === event1.id && a.sequenceNumber === 1);
    if (lot1) {
      event1.activeLotId = lot1.id;
      await em.save(event1);
      console.log(`Updated Event 1 ActiveLotId to Lot 1 (${lot1.id})`);
    }

    // 8. Clean BullMQ jobs for old auctions
    console.log('Cleaning BullMQ jobs for old auctions...');
    for (const id of oldAuctionIds) {
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

    // 9. Schedule end-auction job for Lot 1 if active
    if (lot1) {
      const delay = lot1.endTime.getTime() - Date.now();
      await queue.add(
        'end-auction',
        { auctionId: lot1.id },
        { delay: Math.max(0, delay), jobId: `end-${lot1.id}` }
      );
      console.log(`Scheduled end-auction job for Event 1 Lot 1 in ${Math.round(delay / 1000)} seconds.`);
    }

    console.log('----------------------------------------------------');
    console.log('Database seeded successfully with 3 auctions!');
    console.log('1. Live Event ID:', event1.id);
    console.log('   Lot 1 ID (Active):', lot1?.id);
    console.log('2. 1-Hour Event ID:', events[1].id);
    console.log('3. Tomorrow Event ID:', events[2].id);
    console.log('----------------------------------------------------');

  } catch (err) {
    console.error('Error running seed script:', err);
  } finally {
    await app.close();
  }
}

run();
