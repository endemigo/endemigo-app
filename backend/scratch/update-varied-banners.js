const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://fatihkartal@localhost:5432/endemigo'
  });
  
  await client.connect();
  
  try {
    const variedBanners = [
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c01',
        name: 'Ana Sayfa Orta Kuşak Kampanyası',
        slug: 'home-middle-promo',
        slideDuration: 3000,
        aspectRatio: '3:1',
        items: [
          {
            id: 'middle-slide-1',
            imageUrl: 'https://images.unsplash.com/photo-1506844987005-59b3a017e8b6?q=80&w=1200&h=400&fit=crop',
            actionType: 'CATEGORY',
            actionValue: '379345c6-090b-4648-9adf-1cb3ef96dfee', // Pul & Para
            title: { tr: 'Koleksiyon Pulları', en: 'Stamps Collection' },
            subtitle: { tr: 'Sınırlı süreliğine %15 indirim', en: '15% off for a limited time' }
          },
          {
            id: 'middle-slide-2',
            imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200&h=400&fit=crop',
            actionType: 'CATEGORY',
            actionValue: 'd1f8a078-89f9-4a09-8b04-6d63671b3f43', // Koleksiyon
            title: { tr: 'Nadir Antikalar', en: 'Rare Antiques' },
            subtitle: { tr: 'Eşsiz tarih parçaları', en: 'Unique historical objects' }
          },
          {
            id: 'middle-slide-3',
            imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=1200&h=400&fit=crop',
            actionType: 'SEARCH',
            actionValue: 'zeytinyağı',
            title: { tr: 'Ege Zeytinyağları', en: 'Aegean Olive Oils' },
            subtitle: { tr: 'Doğal soğuk sıkım zeytinyağı', en: 'Natural cold press olive oil' }
          },
          {
            id: 'middle-slide-4',
            imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=1200&h=400&fit=crop',
            actionType: 'CUSTOM_ROUTE',
            actionValue: '/(tabs)/wallet',
            title: { tr: 'Cüzdan Fırsatı', en: 'Wallet Promotions' },
            subtitle: { tr: 'Hızlı bakiye yükle ve kazan', en: 'Top-up fast and earn' }
          }
        ] // 4 slides
      },
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c02',
        name: 'Kategori Kahraman Bannerı',
        slug: 'home-category-hero',
        slideDuration: 5000,
        aspectRatio: '16:9',
        items: [
          {
            id: 'cat-hero-1',
            imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1200&h=675&fit=crop',
            actionType: 'AUCTIONS',
            actionValue: '8cfe9554-30f8-4d13-9860-4e24f5bcb628', // Modern Sanat Tablo
            title: { tr: 'Modern Sanat Sergisi ve Canlı Teklifler', en: 'Modern Art Exhibition & Bids' },
            subtitle: { tr: 'Ödüllü sanatçıların başyapıtları canlı yayında', en: 'Masterpieces by award-winning artists' }
          },
          {
            id: 'cat-hero-2',
            imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1200&h=675&fit=crop',
            actionType: 'CATEGORY',
            actionValue: '8bd1479e-81cc-4d7d-9ac7-d80b0254ce1f', // Resim
            title: { tr: 'Yağlı Boya Başyapıtları', en: 'Oil Painting Masterpieces' },
            subtitle: { tr: 'Evlere renk katan eşsiz tuvaller', en: 'Canvas that colors up homes' }
          }
        ] // 2 slides
      },
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c03',
        name: 'Ana Sayfa Kare Öne Çıkanlar',
        slug: 'home-square-banner',
        slideDuration: 3000,
        aspectRatio: '1:1',
        items: [
          {
            id: 'square-slide-1',
            imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1000&h=1000&fit=crop',
            actionType: 'PRODUCT',
            actionValue: 'a8024ab4-cfd3-47d3-98f6-7266b6a1bc21', // Antika Konsol
            title: { tr: 'Antika Konsol', en: 'Antique Console' },
            subtitle: { tr: 'Klasik meşe mobilya', en: 'Classic oak furniture' }
          },
          {
            id: 'square-slide-2',
            imageUrl: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=1000&h=1000&fit=crop',
            actionType: 'PRODUCT',
            actionValue: 'a404b8ec-dc3a-413a-a518-770528f6849b', // El halisi
            title: { tr: 'El Dokuma İpek Halı', en: 'Handwoven Silk Rug' },
            subtitle: { tr: 'Anadolu motifleri', en: 'Anatolian motifs' }
          },
          {
            id: 'square-slide-3',
            imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1000&h=1000&fit=crop',
            actionType: 'PRODUCT',
            actionValue: '4b5a9fd7-1777-4881-b7ee-685d1992c490', // Akıllı Telefon
            title: { tr: 'Akıllı Telefon', en: 'Smartphone' },
            subtitle: { tr: 'En son teknoloji', en: 'Latest technology' }
          },
          {
            id: 'square-slide-4',
            imageUrl: 'https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?q=80&w=1000&h=1000&fit=crop',
            actionType: 'CATEGORY',
            actionValue: '379345c6-090b-4648-9adf-1cb3ef96dfee', // Pul & Para
            title: { tr: 'Madeni Paralar', en: 'Rare Coins' },
            subtitle: { tr: 'Eski gümüş koleksiyonu', en: 'Old silver collection' }
          },
          {
            id: 'square-slide-5',
            imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1000&h=1000&fit=crop',
            actionType: 'AUCTIONS',
            actionValue: '3b54b5c4-c8ef-4fd4-bb7d-d364b49dd159', // Klasik otomobiller
            title: { tr: 'Klasik Arabalar', en: 'Classic Automobiles' },
            subtitle: { tr: 'Retro garaj koleksiyonu', en: 'Retro garage collection' }
          },
          {
            id: 'square-slide-6',
            imageUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1000&h=1000&fit=crop',
            actionType: 'CATEGORY',
            actionValue: '491e752f-a535-4306-b519-6f947bd5ec50', // Fotoğraf
            title: { tr: 'Sanatsal Fotoğraf', en: 'Fine Art Photo' },
            subtitle: { tr: 'Sınırlı sayıda basım', en: 'Limited edition' }
          }
        ] // 6 slides
      },
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c04',
        name: 'Cüzdan ve Ödeme Bannerı',
        slug: 'wallet-topup-slider',
        slideDuration: 4000,
        aspectRatio: '4:3',
        items: [
          {
            id: 'wallet-slide-1',
            imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=1200&h=900&fit=crop',
            actionType: 'CUSTOM_ROUTE',
            actionValue: '/(tabs)/wallet',
            title: { tr: 'İlk Yüklemeye Özel Kredi Bonusu!', en: 'Exclusive First Deposit Bonus!' },
            subtitle: { tr: 'Cüzdana bakiye ekleyin, anında %10 ekstra hediye kazanın', en: 'Top up your wallet, get instant 10% extra gift credits' }
          }
        ] // 1 slide (tek)
      },
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c05',
        name: 'Satıcı Ol Davet Bannerı',
        slug: 'seller-onboarding-promo',
        slideDuration: 3000,
        aspectRatio: '3:1',
        items: [
          {
            id: 'seller-slide-1',
            imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&h=400&fit=crop',
            actionType: 'CUSTOM_ROUTE',
            actionValue: '/(tabs)/become-seller',
            title: { tr: 'Mağazanı 5 Dakikada Ücretsiz Aç!', en: 'Open Your Shop in 5 Mins for Free!' },
            subtitle: { tr: 'Endemigo satıcı ağına katılın, komisyonsuz satış yapın', en: 'Join Endemigo seller network, sell with 0% commission' }
          },
          {
            id: 'seller-slide-2',
            imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200&h=400&fit=crop',
            actionType: 'CUSTOM_ROUTE',
            actionValue: '/(tabs)/seller-dashboard',
            title: { tr: 'Satışlarını Dünyaya Genişlet', en: 'Expand Sales Globally' },
            subtitle: { tr: 'Özel entegrasyonlar ve gelişmiş lojistik paneli', en: 'Custom integrations and advanced logistics panel' }
          }
        ] // 2 slides
      },
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c06',
        name: 'Müzayede Kenar Reklamı',
        slug: 'auction-sidebar-widget',
        slideDuration: 3500,
        aspectRatio: '1:1',
        items: [
          {
            id: 'sidebar-slide-1',
            imageUrl: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?q=80&w=1000&h=1000&fit=crop',
            actionType: 'AUCTIONS',
            actionValue: '28201623-37a5-4b6e-8440-c48a3e0dc116', // Osmanlı Müzayedesi
            title: { tr: 'Osmanlı Tarihi Eser Müzayedesi', en: 'Ottoman Historical Artifacts Auction' },
            subtitle: { tr: 'Padişah fermanları ve saray eşyaları', en: 'Sultan decrees and palace belongings' }
          },
          {
            id: 'sidebar-slide-2',
            imageUrl: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=1000&h=1000&fit=crop',
            actionType: 'AUCTIONS',
            actionValue: '3b54b5c4-c8ef-4fd4-bb7d-d364b49dd159', // Klasik otomobiller
            title: { tr: 'Klasik Araba Müzayedesi', en: 'Classic Car Auction' },
            subtitle: { tr: 'Nadir garaj araçları', en: 'Rare garage items' }
          },
          {
            id: 'sidebar-slide-3',
            imageUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1000&h=1000&fit=crop',
            actionType: 'AUCTIONS',
            actionValue: 'f514030b-e73a-4b94-b9cd-45a6b61581a1', // Kitaplar
            title: { tr: 'Kitap Müzayedesi', en: 'Rare Book Auction' },
            subtitle: { tr: 'İlk baskılar ve elyazmaları', en: 'First editions and manuscripts' }
          },
          {
            id: 'sidebar-slide-4',
            imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1000&h=1000&fit=crop',
            actionType: 'AUCTIONS',
            actionValue: '8cfe9554-30f8-4d13-9860-4e24f5bcb628', // Modern Sanat
            title: { tr: 'Modern Sanat Canlı Yayında', en: 'Modern Art Live Broadcast' },
            subtitle: { tr: 'Çağdaş koleksiyon teklifleri', en: 'Contemporary collection offers' }
          }
        ] // 4 slides
      },
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c07',
        name: 'Arama Sonuçları Üst Bannerı',
        slug: 'search-results-lead',
        slideDuration: 4500,
        aspectRatio: '3:1',
        items: [
          {
            id: 'search-lead-slide-1',
            imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=1200&h=400&fit=crop',
            actionType: 'SEARCH',
            actionValue: 'el halısı',
            title: { tr: 'Eşsiz El Dokuması Halılarda İndirim!', en: 'Unique Handwoven Rugs Discount!' },
            subtitle: { tr: 'Anadolu motifli el yapımı halılarda kargo bedava', en: 'Free shipping on Anatolian handmade rugs' }
          }
        ] // 1 slide (tek)
      },
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c08',
        name: 'Sepet İçi Öne Çıkan Fırsat',
        slug: 'cart-checkout-upsell',
        slideDuration: 3000,
        aspectRatio: '4:3',
        items: [
          {
            id: 'cart-upsell-slide-1',
            imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&h=900&fit=crop',
            actionType: 'PRODUCT',
            actionValue: '4b5a9fd7-1777-4881-b7ee-685d1992c490', // Akıllı Telefon
            title: { tr: 'Sepetine Özel Teknoloji Fırsatı!', en: 'Tech Deal Specialized for Your Cart!' },
            subtitle: { tr: 'Ask Price akıllı telefon tekliflerinde kaçırılmayacak indirim', en: 'Exclusive discount on Ask Price smart phone offers' }
          },
          {
            id: 'cart-upsell-slide-2',
            imageUrl: 'https://images.unsplash.com/photo-1fd60dda8-8850-477e-9fd3-17fa3dd6eb4b?q=80&w=1200&h=900&fit=crop',
            actionType: 'PRODUCT',
            actionValue: 'fd60dda8-8850-477e-9fd3-17fa3dd6eb4b', // Dizustu Bilgisayar
            title: { tr: 'Sepetine Özel Bilgisayar Teklifi', en: 'Special Computer Offer' },
            subtitle: { tr: 'Profesyoneller için iş istasyonu', en: 'Workstation for professionals' }
          }
        ] // 2 slides
      },
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c09',
        name: 'Keşfet Sayfası Tanıtım Bannerı',
        slug: 'explore-tab-hero',
        slideDuration: 4000,
        aspectRatio: '16:9',
        items: [
          {
            id: 'explore-hero-slide-1',
            imageUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1200&h=675&fit=crop',
            actionType: 'AUCTIONS',
            actionValue: 'f514030b-e73a-4b94-b9cd-45a6b61581a1', // Kitap Müzayedesi
            title: { tr: 'Nadir Kitaplar & El Yazmaları Canlı Müzayedesi', en: 'Rare Books & Manuscripts Live Auction' },
            subtitle: { tr: 'İmzalı ilk baskılar ve paha biçilmez parşömenler', en: 'Signed first editions and priceless parchments' }
          },
          {
            id: 'explore-hero-slide-2',
            imageUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1200&h=675&fit=crop',
            actionType: 'CATEGORY',
            actionValue: '491e752f-a535-4306-b519-6f947bd5ec50', // Fotograf
            title: { tr: 'Sanatsal Fotoğraflar Galerisi', en: 'Fine Art Photography Gallery' },
            subtitle: { tr: 'Ödüllü sanatçıların imzalı fotoğrafları', en: 'Signed prints by award-winning photographers' }
          },
          {
            id: 'explore-hero-slide-3',
            imageUrl: 'https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?q=80&w=1200&h=675&fit=crop',
            actionType: 'CATEGORY',
            actionValue: '379345c6-090b-4648-9adf-1cb3ef96dfee', // Pul & Para
            title: { tr: 'Tarihi Sikkeler & Madalyalar', en: 'Historical Coins & Medals' },
            subtitle: { tr: 'Antik çağlardan bugüne para koleksiyonları', en: 'Coin collections from antiquity to present day' }
          },
          {
            id: 'explore-hero-slide-4',
            imageUrl: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=1200&h=675&fit=crop',
            actionType: 'PRODUCT',
            actionValue: 'a404b8ec-dc3a-413a-a518-770528f6849b', // Hali
            title: { tr: 'Geleneksel El Dokuması Halılar', en: 'Traditional Handwoven Carpets' },
            subtitle: { tr: 'Kültürel zenginliğe sahip Anadolu dokumaları', en: 'Anatolian weaves with cultural richness' }
          },
          {
            id: 'explore-hero-slide-5',
            imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1200&h=675&fit=crop',
            actionType: 'PRODUCT',
            actionValue: 'a8024ab4-cfd3-47d3-98f6-7266b6a1bc21', // Antika konsol
            title: { tr: 'El Yapımı Vintage Mobilyalar', en: 'Handcrafted Vintage Furniture' },
            subtitle: { tr: 'Restorasyonu tamamlanmış benzersiz parçalar', en: 'Unique fully-restored design objects' }
          },
          {
            id: 'explore-hero-slide-6',
            imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1200&h=675&fit=crop',
            actionType: 'AUCTIONS',
            actionValue: '8cfe9554-30f8-4d13-9860-4e24f5bcb628', // Modern Sanat
            title: { tr: 'Premium Çağdaş Sanat Eserleri', en: 'Premium Contemporary Art Pieces' },
            subtitle: { tr: 'Sanat yatırımı için eşsiz tablo koleksiyonu', en: 'Unique painting collection for art investment' }
          }
        ] // 6 slides
      }
    ];

    console.log('Clearing and updating existing 9 banners with varied slide counts (4, 6, 2, 1)...');

    for (const banner of variedBanners) {
      console.log(`Deleting banner '${banner.slug}'...`);
      await client.query("DELETE FROM banners WHERE slug = $1", [banner.slug]);
      
      console.log(`Inserting varied banner '${banner.name}' with ${banner.items.length} slides...`);
      await client.query(`
        INSERT INTO banners (id, name, slug, "slideDuration", "aspectRatio", items, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [
        banner.id,
        banner.name,
        banner.slug,
        banner.slideDuration,
        banner.aspectRatio,
        JSON.stringify(banner.items)
      ]);
    }

    console.log('SUCCESS: All 9 banners successfully updated with highly varied slide counts!');

  } catch (err) {
    console.error('ERROR updating varied banners:', err);
  } finally {
    await client.end();
  }
}

main();
