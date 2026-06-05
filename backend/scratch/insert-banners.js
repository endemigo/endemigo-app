const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://fatihkartal@localhost:5432/endemigo'
  });
  
  await client.connect();
  
  try {
    console.log('Clearing existing banners to avoid slug conflicts...');
    await client.query("DELETE FROM banners WHERE slug = 'home-slider'");
    
    const bannerId = '809d43ef-118e-4a87-b9cd-0925afde7c03';
    const bannerItems = [
      {
        id: 'slide-1-antika',
        imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200&h=675&fit=crop',
        actionType: 'CATEGORY',
        actionValue: 'd1f8a078-89f9-4a09-8b04-6d63671b3f43', // Koleksiyon
        title: { tr: 'Antika & Koleksiyon Dünyası', en: 'Antique & Collectibles World' },
        subtitle: { tr: 'Eşsiz tarihe sahip parçaları keşfedin', en: 'Discover unique historical pieces' },
        requireConfirmation: false,
        confirmationText: { tr: '', en: '' },
        confirmationButtonText: { tr: 'Devam Et', en: 'Continue' }
      },
      {
        id: 'slide-2-osmanli',
        imageUrl: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=1200&h=675&fit=crop',
        actionType: 'AUCTIONS',
        actionValue: '28201623-37a5-4b6e-8440-c48a3e0dc116', // Osmanlı
        title: { tr: 'Canlı Antika Müzayedesi', en: 'Live Antique Auction' },
        subtitle: { tr: 'Osmanlı eserleri tekliflerinizi bekliyor', en: 'Ottoman works are waiting for your bids' },
        requireConfirmation: true,
        confirmationText: { tr: 'Müzayede sayfasına yönlendiriliyorsunuz. Teklif vermek için cüzdan bakiyeniz olması gerekir.', en: 'You are being redirected to the auction page. You need a wallet balance to place a bid.' },
        confirmationButtonText: { tr: 'Müzayedeye Git', en: 'Go to Auction' }
      },
      {
        id: 'slide-3-hali',
        imageUrl: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=1200&h=675&fit=crop',
        actionType: 'PRODUCT',
        actionValue: 'a404b8ec-dc3a-413a-a518-770528f6849b', // El halisi
        title: { tr: 'El Dokuma İpek Halılar', en: 'Handwoven Silk Rugs' },
        subtitle: { tr: 'Geleneksel motifler, modern dokunuşlar', en: 'Traditional motifs, modern touches' },
        requireConfirmation: false,
        confirmationText: { tr: '', en: '' },
        confirmationButtonText: { tr: 'Devam Et', en: 'Continue' }
      },
      {
        id: 'slide-4-para',
        imageUrl: 'https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?q=80&w=1200&h=675&fit=crop',
        actionType: 'CATEGORY',
        actionValue: '379345c6-090b-4648-9adf-1cb3ef96dfee', // Pul & Para
        title: { tr: 'Nadir Pullar & Madeni Paralar', en: 'Rare Stamps & Coins' },
        subtitle: { tr: 'Tarihin tozlu sayfalarından koleksiyonunuza', en: 'From the dusty pages of history to your collection' },
        requireConfirmation: false,
        confirmationText: { tr: '', en: '' },
        confirmationButtonText: { tr: 'Devam Et', en: 'Continue' }
      },
      {
        id: 'slide-5-araba',
        imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&h=675&fit=crop',
        actionType: 'AUCTIONS',
        actionValue: '3b54b5c4-c8ef-4fd4-bb7d-d364b49dd159', // Klasik otomobiller
        title: { tr: 'Klasik Otomobiller Serisi', en: 'Classic Cars Series' },
        subtitle: { tr: 'Retro otomobil tutkunları için özel seçki', en: 'Special selection for retro car enthusiasts' },
        requireConfirmation: false,
        confirmationText: { tr: '', en: '' },
        confirmationButtonText: { tr: 'Devam Et', en: 'Continue' }
      },
      {
        id: 'slide-6-resim',
        imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1200&h=675&fit=crop',
        actionType: 'CATEGORY',
        actionValue: '8bd1479e-81cc-4d7d-9ac7-d80b0254ce1f', // Resim
        title: { tr: 'Modern Tablolar & Yağlı Boyalar', en: 'Modern Paintings & Oils' },
        subtitle: { tr: 'Evinizin havasını değiştirecek başyapıtlar', en: 'Masterpieces that will change your home vibe' },
        requireConfirmation: false,
        confirmationText: { tr: '', en: '' },
        confirmationButtonText: { tr: 'Devam Et', en: 'Continue' }
      },
      {
        id: 'slide-7-zeytin',
        imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=1200&h=675&fit=crop',
        actionType: 'SEARCH',
        actionValue: 'zeytinyağı',
        title: { tr: 'Doğal Ege Zeytinyağları', en: 'Natural Aegean Olive Oils' },
        subtitle: { tr: 'Soğuk sıkım zeytinyağı fırsatlarını kaçırmayın', en: 'Don\'t miss out on cold press olive oil deals' },
        requireConfirmation: false,
        confirmationText: { tr: '', en: '' },
        confirmationButtonText: { tr: 'Devam Et', en: 'Continue' }
      },
      {
        id: 'slide-8-cuzdan',
        imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=1200&h=675&fit=crop',
        actionType: 'CUSTOM_ROUTE',
        actionValue: '/(tabs)/wallet',
        title: { tr: 'Cüzdana Bakiye Yükle %10 Kazan', en: 'Top-up Wallet & Get 10% Bonus' },
        subtitle: { tr: 'Tüm müzayedelerde geçerli hediye kredi', en: 'Gift credits valid for all auctions' },
        requireConfirmation: false,
        confirmationText: { tr: '', en: '' },
        confirmationButtonText: { tr: 'Devam Et', en: 'Continue' }
      },
      {
        id: 'slide-9-satici',
        imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200&h=675&fit=crop',
        actionType: 'CUSTOM_ROUTE',
        actionValue: '/(tabs)/become-seller',
        title: { tr: 'Endemigo\'da Satıcı Olun', en: 'Become a Seller on Endemigo' },
        subtitle: { tr: 'Yöresel ürünlerinizi tüm dünyaya ulaştırın', en: 'Reach the entire world with your local products' },
        requireConfirmation: false,
        confirmationText: { tr: '', en: '' },
        confirmationButtonText: { tr: 'Devam Et', en: 'Continue' }
      },
      {
        id: 'slide-10-fotograf',
        imageUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1200&h=675&fit=crop',
        actionType: 'CATEGORY',
        actionValue: '491e752f-a535-4306-b519-6f947bd5ec50', // Fotoğraf
        title: { tr: 'Sınırlı Baskı Sanatsal Fotoğraflar', en: 'Limited Edition Fine Art Photos' },
        subtitle: { tr: 'Ödüllü sanatçıların kadrajından eserler', en: 'Works from the frames of award-winning artists' },
        requireConfirmation: false,
        confirmationText: { tr: '', en: '' },
        confirmationButtonText: { tr: 'Devam Et', en: 'Continue' }
      }
    ];

    console.log('Inserting 10 beautiful marketplace slides into banners table...');
    
    await client.query(`
      INSERT INTO banners (id, name, slug, "slideDuration", "aspectRatio", items, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `, [
      bannerId,
      'Ana Sayfa Kampanya Sliderı',
      'home-slider',
      4000,
      '16:9',
      JSON.stringify(bannerItems)
    ]);
    
    console.log('SUCCESS: Banner "home-slider" containing 10 beautiful Unsplash-based slides inserted successfully!');

  } catch (err) {
    console.error('ERROR seeding banners:', err);
  } finally {
    await client.end();
  }
}

main();
