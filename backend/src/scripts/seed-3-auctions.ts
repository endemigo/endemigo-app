import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuctionEvent } from '../modules/auction/entities/auction-event.entity';
import { Auction } from '../modules/auction/entities/auction.entity';
import { Bid } from '../modules/auction/entities/bid.entity';
import { Product } from '../modules/product/entities/product.entity';
import { Category } from '../modules/product/entities/category.entity';
import { User } from '../modules/user/entities/user.entity';
import { AuctionRegistration } from '../modules/auction/entities/auction-registration.entity';
import { ProductImage } from '../modules/product/entities/product-image.entity';
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

// Wikimedia Commons görselleri — her biri başlıkla eşleşecek şekilde tek tek doğrulandı.
type SeedProduct = { title: string; description: string; imageUrl: string };

// Event 1 — Canlı Antika ve Efemera Müzayedesi (lot 1-10)
const ANTIQUE_PRODUCTS: SeedProduct[] = [
  {
    title: 'Antika Gümüş Cep Saati',
    description: '19. yüzyıl sonuna tarihlenen, köstekli gümüş cep saati. Mekanik kurmalı, çalışır durumda.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Pocket_watch_with_chain.jpg/960px-Pocket_watch_with_chain.jpg',
  },
  {
    title: 'Antika Pirinç Semaver',
    description: 'Geleneksel el işçiliği pirinç semaver. Gövdesinde dönem işçiliği kabartmalar bulunur.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/2024.03.30_Brass_Samovar_Flea_market_in_Minsk.jpg/960px-2024.03.30_Brass_Samovar_Flea_market_in_Minsk.jpg',
  },
  {
    title: 'Antika Gramofon',
    description: 'Borulu, kurmalı taş plak gramofon. Ahşap kasası orijinaldir, çalışır durumda.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Antique_HMV_gramophone-_phonograph-_record_player.jpg/960px-Antique_HMV_gramophone-_phonograph-_record_player.jpg',
  },
  {
    title: 'Eski Daktilo',
    description: '20. yüzyıl başına ait mekanik daktilo. Tuş takımı eksiksiz, koleksiyonluk parça.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Vienna_-_Vintage_typewriter_-_0141.jpg/960px-Vienna_-_Vintage_typewriter_-_0141.jpg',
  },
  {
    title: 'Sarkaçlı Antika Duvar Saati',
    description: 'Ahşap kasalı, sarkaçlı duvar saati. Kadranı orijinal, mekanizması revizyonludur.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Irish_Pendulum_Wall_Clock.jpg/960px-Irish_Pendulum_Wall_Clock.jpg',
  },
  {
    title: 'Antika Bakır İbrik',
    description: 'El dövmesi bakır ibrik. Kalaylı, gövdesinde usta işçiliği görülür.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/N.H._Yeckley%2C_Copper_Pitcher%2C_1935-1942%2C_NGA_29557.jpg/960px-N.H._Yeckley%2C_Copper_Pitcher%2C_1935-1942%2C_NGA_29557.jpg',
  },
  {
    title: 'Körüklü Antika Fotoğraf Makinesi',
    description: 'Körüklü analog fotoğraf makinesi. Optikleri temiz, körüğü sağlamdır.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Vintage_Kodak_Junior_Six-20_Series_II_Folding_Film_Camera_%2815869618824%29.jpg/960px-Vintage_Kodak_Junior_Six-20_Series_II_Folding_Film_Camera_%2815869618824%29.jpg',
  },
  {
    title: 'Antika Gaz Lambası',
    description: 'Fitilli antika gaz lambası. Camı orijinal, gövdesi sağlamdır.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Gas_Lamp_MET_ADA202.jpg/960px-Gas_Lamp_MET_ADA202.jpg',
  },
  {
    title: 'Antika Gümüş Şamdan',
    description: 'İşlemeli gümüş şamdan. Dönem işçiliği, damgalıdır.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Frank_M._Keane%2C_Silver_Candlestick%2C_1935-1942%2C_NGA_26589.jpg/960px-Frank_M._Keane%2C_Silver_Candlestick%2C_1935-1942%2C_NGA_26589.jpg',
  },
  {
    title: 'Lambalı Antika Radyo',
    description: 'Ahşap kasalı lambalı radyo. Kabini orijinal, koleksiyonluk.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Old_vintage_radio_-_Offenburg.jpg/960px-Old_vintage_radio_-_Offenburg.jpg',
  },
];

// Event 2 — Nadir Kitaplar ve İmzalı Özel Baskılar Müzayedesi (lot 1-10)
const BOOK_PRODUCTS: SeedProduct[] = [
  {
    title: 'Deri Ciltli Antika Kitap',
    description: 'Deri ciltli, kapağı kabartma işlemeli antika kitap. Sayfaları sağlam.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Decorated_leather_binding%2C_family_bible%2C_19th_century.jpg',
  },
  {
    title: 'Osmanlıca El Yazması',
    description: 'Osmanlıca el yazması eser. Dönemine göre iyi kondisyonda, sayfaları eksiksiz.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Ottoman_Manuscript_World_Encyclopedia_%2810739007%29.jpg/960px-Ottoman_Manuscript_World_Encyclopedia_%2810739007%29.jpg',
  },
  {
    title: 'Antika Dünya Haritası',
    description: '18. yüzyıl gravür dünya haritası. Çift yarımküre kompozisyonlu, koleksiyonluk baskı.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/1794_Samuel_Dunn_Wall_Map_of_the_World_in_Hemispheres_-_Geographicus_-_World2-dunn-1794.jpg/960px-1794_Samuel_Dunn_Wall_Map_of_the_World_in_Hemispheres_-_Geographicus_-_World2-dunn-1794.jpg',
  },
  {
    title: 'Hat Sanatı Levha',
    description: "Talik hatla yazılmış hat sanatı levha. Klasik üslupta, tezhipli.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Calligraphic_panel_%28nasta%27liq%29.jpg/960px-Calligraphic_panel_%28nasta%27liq%29.jpg",
  },
  {
    title: 'Kabartma Deri Ciltli Yazma Eser',
    description: 'Kabartma deri cildiyle nadir yazma eser. Cilt işçiliği dönem karakteristiğindedir.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Embossed_leather_binding_on_12th_century_manuscript_LCCN2006681054.jpg/960px-Embossed_leather_binding_on_12th_century_manuscript_LCCN2006681054.jpg',
  },
  {
    title: 'Antika Ansiklopedi Seti',
    description: 'Cilt takımı halinde antika ansiklopedi seti. Ciltleri sağlam, seri tamdır.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Encyclopedia_Britannica%2C_9th_edition%2C_on_a_bookcase.jpg/960px-Encyclopedia_Britannica%2C_9th_edition%2C_on_a_bookcase.jpg',
  },
  {
    title: 'Tarihi Gazete Arşivi',
    description: '20. yüzyıl başına ait tarihi gazete. Ön sayfası eksiksiz, okunur durumda.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Front_page_of_newspaper_Wilnaer_Zeitung_with_Lithuanian_Vytis_%28Waykimas%29%2C_published_on_12_April_1918.jpg/960px-Front_page_of_newspaper_Wilnaer_Zeitung_with_Lithuanian_Vytis_%28Waykimas%29%2C_published_on_12_April_1918.jpg',
  },
  {
    title: 'Antika Kartpostal',
    description: 'Dönem fotoğraflı antika kartpostal. Renkleri canlı, kondisyonu iyidir.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Fairmount_park_vintage_postcard_1.jpg/960px-Fairmount_park_vintage_postcard_1.jpg',
  },
  {
    title: 'Minyatürlü Yazma Eser',
    description: 'Minyatürle bezeli yazma eser sayfası. Altın yaldız detaylı, müzelik kalitede.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Miraj_by_Sultan_Muhammad.jpg/960px-Miraj_by_Sultan_Muhammad.jpg',
  },
  {
    title: 'Antika Gravür Baskı',
    description: '18. yüzyıl gravür baskı. Asitsiz paspartu ile korunmuştur.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Easton_Lodge_Essex_England_18th-century_engraving_01.jpg/960px-Easton_Lodge_Essex_England_18th-century_engraving_01.jpg',
  },
];

// Event 3 — Anadolu Kilimleri ve Klasik Halılar Müzayedesi (lot 1-10)
const RUG_PRODUCTS: SeedProduct[] = [
  {
    title: 'El Dokuması Anadolu Kilimi',
    description: 'Kök boyalı, el dokuması Anadolu kilimi. Geometrik motifli, sağlam dokuda.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Antalya_museum_Anatolian_%E2%80%98slit-kilim%E2%80%99_Mid-20th_century_4847.jpg/960px-Antalya_museum_Anatolian_%E2%80%98slit-kilim%E2%80%99_Mid-20th_century_4847.jpg',
  },
  {
    title: 'Hereke İpek Halı',
    description: 'İnce dokuma Hereke ipek halı. Yüksek düğüm yoğunluğu, canlı renkler.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Hereke_Teppich_410DSC_0030_%2848031233357%29.jpg/960px-Hereke_Teppich_410DSC_0030_%2848031233357%29.jpg',
  },
  {
    title: 'Antika Uşak Halısı',
    description: 'Yıldız madalyonlu klasik Uşak halısı. Doğal boyalı, dönem dokuması.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Star_Ushak_Carpet_MET_DP270097.jpg/960px-Star_Ushak_Carpet_MET_DP270097.jpg',
  },
  {
    title: 'Kafkas Halısı',
    description: '19. yüzyıl Kafkas halısı. Geleneksel motifli, yünü parlak, renkleri doğal.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Bijo_rug-XIX_century.jpg',
  },
  {
    title: 'Antika Seccade',
    description: 'El dokuması antika Anadolu seccadesi. Mihrap desenli, koleksiyonluk.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Antique_Anatolian_Prayer_Rug.jpg',
  },
  {
    title: 'El Dokuması Heybe',
    description: 'El dokuması çift gözlü heybe. Orijinal detayları korunmuştur.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Double_Saddlebag_%28Khorjin%29_MET_DP700915.jpg/960px-Double_Saddlebag_%28Khorjin%29_MET_DP700915.jpg',
  },
  {
    title: 'El Dokuması Yolluk Kilim',
    description: 'Konya yöresi el dokuması yolluk kilim. Kullanıma ve sergilemeye uygundur.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Istanbul_Former_Mint_Kilim_exposition_Floor_covering_%28%E2%80%98Yolluk%E2%80%99_Runner%29._Kilim._From_the_Konya_region_Detail_in_2003_13.jpg/960px-Istanbul_Former_Mint_Kilim_exposition_Floor_covering_%28%E2%80%98Yolluk%E2%80%99_Runner%29._Kilim._From_the_Konya_region_Detail_in_2003_13.jpg',
  },
  {
    title: 'Antika İran Halısı',
    description: 'Madalyonlu antika İran halısı. Bitkisel boyalı, zemin deseni yoğun işlemelidir.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Indo-Persian_carpet_with_medallions_MET_DP265209.jpg',
  },
  {
    title: 'Kilim Yastık',
    description: 'Eski kilim parçasından dikilmiş yastık. Ön yüzü el dokuması orijinal kilimdir.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Farwayart-Vintage-tribal-kilim-pillow7.jpg/960px-Farwayart-Vintage-tribal-kilim-pillow7.jpg',
  },
  {
    title: 'Antika Selçuklu Dönemi Halı',
    description: 'Selçuklu dönemi karakterinde antika halı. Müzelik nitelikte, nadir parça.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Seljuq_Rug_from_the_Alaaddin_Mosque_in_Konya_%28TIEM_681%29.jpg/960px-Seljuq_Rug_from_the_Alaaddin_Mosque_in_Konya_%28TIEM_681%29.jpg',
  },
];

const SEED_PRODUCTS: SeedProduct[] = [...ANTIQUE_PRODUCTS, ...BOOK_PRODUCTS, ...RUG_PRODUCTS];

const EVENT_COVER_URLS = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/2024.05.01_Nowogrodek_Navahrudak_Vintage_Shop_Old_Porcelaine.jpg/1280px-2024.05.01_Nowogrodek_Navahrudak_Vintage_Shop_Old_Porcelaine.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Dublin_Old_Library_Trinity_College_05.jpg/1280px-Dublin_Old_Library_Trinity_College_05.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Turkish_rugs_for_sale_in_Central_Anatolia_%282%29.jpg/960px-Turkish_rugs_for_sale_in_Central_Anatolia_%282%29.jpg',
];

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

    // Eski seed ürünlerini temizle (önceki çalıştırmaların "Seeded Ürün" ve wikimedia görselli kayıtları)
    console.log('Removing previously seeded demo products...');
    await em.query(
      `DELETE FROM product_views WHERE "productId" IN (SELECT id FROM products WHERE title LIKE 'Seeded Ürün%' OR "imageUrl" LIKE '%upload.wikimedia.org%')`,
    );
    const removed = await em.query(
      `DELETE FROM products WHERE title LIKE 'Seeded Ürün%' OR "imageUrl" LIKE '%upload.wikimedia.org%'`,
    );
    console.log(`Removed old seeded products.`, removed?.[1] ?? '');

    // 4. Create 30 different products (başlık + görsel eşleşen temalı ürünler)
    console.log('Creating 30 new products for the auctions...');
    const products: Product[] = [];
    for (let i = 0; i < SEED_PRODUCTS.length; i++) {
      const seedProduct = SEED_PRODUCTS[i];
      const product = em.create(Product, {
        title: seedProduct.title,
        description: seedProduct.description,
        price: 5000 + (i + 1) * 500,
        status: ProductStatus.ACTIVE,
        listingType: ListingType.AUCTION,
        sellerId: seller.id,
        categoryId: category.id,
        imageUrl: seedProduct.imageUrl,
        stockQuantity: 1,
        condition: ProductCondition.NEW,
        originCountry: 'TR',
        images: [
          em.create(ProductImage, {
            url: seedProduct.imageUrl,
            sortOrder: 0,
            isPrimary: true,
          }),
        ],
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
        description: 'Bu şu anda devam etmekte olan canlı müzayedemizdir. Antika saatler, gramofonlar, gümüş objeler ve dönem eşyaları bu müzayedede yer almaktadır.',
        status: AuctionEventStatus.ACTIVE,
        startTime: event1Start,
        endTime: event1End,
      },
      {
        title: 'Nadir Kitaplar ve İmzalı Özel Baskılar Müzayedesi',
        description: 'Yaklaşık 1 saat sonra başlayacak olan bu müzayedede el yazmaları, hat levhaları, gravür baskılar ve nadir koleksiyon kitapları yer almaktadır.',
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
    for (const [eventIdx, data] of eventsData.entries()) {
      const event = em.create(AuctionEvent, {
        title: data.title,
        description: data.description,
        status: data.status,
        startTime: data.startTime,
        endTime: data.endTime,
        auctionType: AuctionType.REALTIME,
        categoryId: category.id,
        coverImageUrl: EVENT_COVER_URLS[eventIdx],
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
