const { Client } = require('pg');

const databaseUrl = 'postgresql://fatihkartal@localhost:5432/endemigo';

async function seed() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('Successfully connected to database.');

    // Clear existing events for clean testing
    console.log('Cleaning up existing mock auction events...');
    await client.query("DELETE FROM auction_events WHERE title LIKE '%Müzayede%' OR title LIKE '%Koleksiyonu%'");

    const now = new Date();

    const events = [
      {
        title: 'Klasik Otomobiller & Retro Koleksiyonu (Taslak)',
        description: 'Nadir bulunan klasik otomobiller, antika yedek parçalar ve nostaljik retro koleksiyon ürünlerinin yer alacağı özel taslak etkinlik.',
        coverImageUrl: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&auto=format&fit=crop&q=80',
        status: 'DRAFT',
        auctionType: 'REALTIME',
        startTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days later
        endTime: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000),
        submissionDeadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Osmanlı Dönemi Eserleri ve Antika Müzayedesi',
        description: 'Sadece onaylı satıcıların katılabileceği, Osmanlı dönemi sikkeler, fermanlar, gümüş eşyalar ve el yazması eserler için ürün başvuru süreci aktif.',
        coverImageUrl: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&auto=format&fit=crop&q=80',
        status: 'APPLICATION',
        auctionType: 'REALTIME',
        startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days later
        endTime: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        submissionDeadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Modern Sanat ve Premium Tablo Koleksiyonu',
        description: 'Yerli ve yabancı ünlü ressamların eşsiz modern sanat eserlerinin sergileneceği ve ön tekliflerin yakında açılacağı prestijli müzayede.',
        coverImageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
        status: 'UPCOMING',
        auctionType: 'REALTIME',
        startTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // 1 day later
        endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        submissionDeadline: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago (closed)
      },
      {
        title: 'Nadir Paralar ve Efemera Canlı Müzayedesi',
        description: 'Cumhuriyet dönemi ilk banknotlar, nadir madeni paralar ve tarihi kartpostalların kıyasıya mücadeleyle canlı yayında sahiplerini bulduğu an!',
        coverImageUrl: 'https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?w=800&auto=format&fit=crop&q=80',
        status: 'ACTIVE',
        auctionType: 'REALTIME',
        startTime: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
        endTime: new Date(now.getTime() + 5 * 60 * 60 * 1000), // 5 hours later
        submissionDeadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Eski Kitaplar ve İmzalı Özel Baskılar Müzayedesi',
        description: 'Geçtiğimiz günlerde tamamlanan, edebiyat dünyasının nadide ilk baskı kitaplarının ve yazarlarından imzalı eserlerin rekor fiyatlarla sonlandığı müzayede.',
        coverImageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&auto=format&fit=crop&q=80',
        status: 'ENDED',
        auctionType: 'REALTIME',
        startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        endTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        submissionDeadline: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      }
    ];

    console.log('Inserting 5 new auction events...');
    for (const event of events) {
      await client.query(
        `INSERT INTO auction_events (
          title, description, "coverImageUrl", status, "auctionType", "startTime", "endTime", "submissionDeadline"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          event.title,
          event.description,
          event.coverImageUrl,
          event.status,
          event.auctionType,
          event.startTime,
          event.endTime,
          event.submissionDeadline
        ]
      );
      console.log(`Inserted event: ${event.title} [Status: ${event.status}]`);
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await client.end();
  }
}

seed();
