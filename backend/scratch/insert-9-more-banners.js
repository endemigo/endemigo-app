const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://fatihkartal@localhost:5432/endemigo'
  });
  
  await client.connect();
  
  try {
    const additionalBanners = [
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c01',
        name: 'Ana Sayfa Orta Kuşak Kampanyası',
        slug: 'home-middle-promo',
        slideDuration: 3000,
        aspectRatio: '3:1',
        items: [
          {
            id: 'slide-middle-1',
            imageUrl: 'https://images.unsplash.com/photo-1506844987005-59b3a017e8b6?q=80&w=1200&h=400&fit=crop',
            actionType: 'CATEGORY',
            actionValue: '379345c6-090b-4648-9adf-1cb3ef96dfee', // Pul & Para
            title: { tr: 'Koleksiyon Pullarında Kaçırılmayacak Fırsat!', en: 'Stamps Collection Exclusive Deal!' },
            subtitle: { tr: 'Sınırlı süreliğine nadir pullarda %15 indirim', en: '15% off rare stamps for a limited time' },
            requireConfirmation: false,
            confirmationText: { tr: '', en: '' },
            confirmationButtonText: { tr: 'Fırsatı Gör', en: 'See Deal' }
          }
        ]
      },
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c02',
        name: 'Kategori Kahraman Bannerı',
        slug: 'home-category-hero',
        slideDuration: 5000,
        aspectRatio: '16:9',
        items: [
          {
            id: 'slide-cat-hero-1',
            imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1200&h=675&fit=crop',
            actionType: 'AUCTIONS',
            actionValue: '8cfe9554-30f8-4d13-9860-4e24f5bcb628', // Modern Sanat Tablo
            title: { tr: 'Modern Sanat Sergisi ve Canlı Teklifler', en: 'Modern Art Exhibition & Live Bids' },
            subtitle: { tr: 'Ödüllü sanatçıların başyapıtları canlı yayında', en: 'Masterpieces by award-winning artists are live' },
            requireConfirmation: true,
            confirmationText: { tr: 'Canlı müzayedeye katılmak üzeresiniz. Teklif kurallarını okuduğunuzdan emin olun.', en: 'You are about to join the live auction. Make sure you read the bidding rules.' },
            confirmationButtonText: { tr: 'Katıl ve Teklif Ver', en: 'Join & Bid' }
          }
        ]
      },
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c03',
        name: 'Ana Sayfa Kare Öne Çıkanlar',
        slug: 'home-square-banner',
        slideDuration: 3000,
        aspectRatio: '1:1',
        items: [
          {
            id: 'slide-square-1',
            imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1000&h=1000&fit=crop',
            actionType: 'PRODUCT',
            actionValue: 'a8024ab4-cfd3-47d3-98f6-7266b6a1bc21', // Antika Konsol
            title: { tr: 'Tarihi Antika Ahşap Konsol', en: 'Historical Antique Wooden Console' },
            subtitle: { tr: 'Koleksiyonunuza değer katacak vintage mobilya', en: 'Vintage furniture to value up your collection' },
            requireConfirmation: false,
            confirmationText: { tr: '', en: '' },
            confirmationButtonText: { tr: 'Detayları İncele', en: 'Review Details' }
          }
        ]
      },
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c04',
        name: 'Cüzdan ve Ödeme Bannerı',
        slug: 'wallet-topup-slider',
        slideDuration: 4000,
        aspectRatio: '4:3',
        items: [
          {
            id: 'slide-wallet-1',
            imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=1200&h=900&fit=crop',
            actionType: 'CUSTOM_ROUTE',
            actionValue: '/(tabs)/wallet',
            title: { tr: 'İlk Yüklemeye Özel Kredi Bonusu!', en: 'Exclusive First Deposit Bonus!' },
            subtitle: { tr: 'Cüzdana bakiye ekleyin, anında %10 ekstra hediye kazanın', en: 'Top up your wallet, get instant 10% extra gift credits' },
            requireConfirmation: false,
            confirmationText: { tr: '', en: '' },
            confirmationButtonText: { tr: 'Bakiye Yükle', en: 'Top Up Now' }
          }
        ]
      },
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c05',
        name: 'Satıcı Ol Davet Bannerı',
        slug: 'seller-onboarding-promo',
        slideDuration: 3000,
        aspectRatio: '3:1',
        items: [
          {
            id: 'slide-seller-1',
            imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&h=400&fit=crop',
            actionType: 'CUSTOM_ROUTE',
            actionValue: '/(tabs)/become-seller',
            title: { tr: 'Mağazanı 5 Dakikada Ücretsiz Aç!', en: 'Open Your Shop in 5 Mins for Free!' },
            subtitle: { tr: 'Endemigo satıcı ağına katılın, komisyonsuz satış yapın', en: 'Join Endemigo seller network, sell with 0% commission' },
            requireConfirmation: false,
            confirmationText: { tr: '', en: '' },
            confirmationButtonText: { tr: 'Satıcı Ol', en: 'Become a Seller' }
          }
        ]
      },
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c06',
        name: 'Müzayede Kenar Reklamı',
        slug: 'auction-sidebar-widget',
        slideDuration: 3500,
        aspectRatio: '1:1',
        items: [
          {
            id: 'slide-sidebar-1',
            imageUrl: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?q=80&w=1000&h=1000&fit=crop',
            actionType: 'AUCTIONS',
            actionValue: '28201623-37a5-4b6e-8440-c48a3e0dc116', // Osmanlı Müzayedesi
            title: { tr: 'Osmanlı Tarihi Eser Müzayedesi', en: 'Ottoman Historical Artifacts Auction' },
            subtitle: { tr: 'Padişah fermanları ve saray eşyaları', en: 'Sultan decrees and palace belongings' },
            requireConfirmation: false,
            confirmationText: { tr: '', en: '' },
            confirmationButtonText: { tr: 'Müzayedeyi Aç', en: 'Open Auction' }
          }
        ]
      },
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c07',
        name: 'Arama Sonuçları Üst Bannerı',
        slug: 'search-results-lead',
        slideDuration: 4500,
        aspectRatio: '3:1',
        items: [
          {
            id: 'slide-search-lead-1',
            imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=1200&h=400&fit=crop',
            actionType: 'SEARCH',
            actionValue: 'el halısı',
            title: { tr: 'Eşsiz El Dokuması Halılarda İndirim!', en: 'Unique Handwoven Rugs Discount!' },
            subtitle: { tr: 'Anadolu motifli el yapımı halılarda kargo bedava', en: 'Free shipping on Anatolian handmade rugs' },
            requireConfirmation: false,
            confirmationText: { tr: '', en: '' },
            confirmationButtonText: { tr: 'Halıları Gör', en: 'See Rugs' }
          }
        ]
      },
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c08',
        name: 'Sepet İçi Öne Çıkan Fırsat',
        slug: 'cart-checkout-upsell',
        slideDuration: 3000,
        aspectRatio: '4:3',
        items: [
          {
            id: 'slide-cart-upsell-1',
            imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&h=900&fit=crop',
            actionType: 'PRODUCT',
            actionValue: '4b5a9fd7-1777-4881-b7ee-685d1992c490', // Akıllı Telefon
            title: { tr: 'Sepetine Özel Teknoloji Fırsatı!', en: 'Tech Deal Specialized for Your Cart!' },
            subtitle: { tr: 'Ask Price akıllı telefon tekliflerinde kaçırılmayacak indirim', en: 'Exclusive discount on Ask Price smart phone offers' },
            requireConfirmation: false,
            confirmationText: { tr: '', en: '' },
            confirmationButtonText: { tr: 'Hemen Teklif Et', en: 'Offer Now' }
          }
        ]
      },
      {
        id: '209d43ef-118e-4a87-b9cd-0925afde7c09',
        name: 'Keşfet Sayfası Tanıtım Bannerı',
        slug: 'explore-tab-hero',
        slideDuration: 4000,
        aspectRatio: '16:9',
        items: [
          {
            id: 'slide-explore-hero-1',
            imageUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1200&h=675&fit=crop',
            actionType: 'AUCTIONS',
            actionValue: 'f514030b-e73a-4b94-b9cd-45a6b61581a1', // Kitap Müzayedesi
            title: { tr: 'Nadir Kitaplar & El Yazmaları Canlı Müzayedesi', en: 'Rare Books & Manuscripts Live Auction' },
            subtitle: { tr: 'İmzalı ilk baskılar ve paha biçilmez parşömenler', en: 'Signed first editions and priceless parchments' },
            requireConfirmation: false,
            confirmationText: { tr: '', en: '' },
            confirmationButtonText: { tr: 'Kataloğu İncele', en: 'Review Catalog' }
          }
        ]
      }
    ];

    console.log('Seeding 9 additional separate banner slots...');

    for (const banner of additionalBanners) {
      console.log(`Clearing banner slug '${banner.slug}'...`);
      await client.query("DELETE FROM banners WHERE slug = $1", [banner.slug]);
      
      console.log(`Inserting banner '${banner.name}'...`);
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

    console.log('SUCCESS: All 9 additional distinct banners seeded cleanly without conflict!');

  } catch (err) {
    console.error('ERROR seeding additional banners:', err);
  } finally {
    await client.end();
  }
}

main();
