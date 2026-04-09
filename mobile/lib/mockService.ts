/**
 * Mock Data — Endemigo iş planına birebir uygun
 *
 * Bu servis backend hazır olana kadar kullanılır.
 * Geçiş: lib/config.ts içinde EXPO_PUBLIC_USE_MOCK=false yapılır,
 * ardından hook'lar otomatik olarak gerçek API'ye döner.
 *
 * Veri modelleri gerçek backend contract'larla aynıdır:
 *   - /products, /categories (useProducts.ts)
 *   - /auctions, /auctions/:id/bids, /auctions/:id/result (useAuctions.ts)
 *   - /wallet/balance (useWallet.ts)
 *   - /auth/login, /auth/register, /auth/profile (authStore.ts)
 */
import { AuctionStatus, ProductStatus } from '@endemigo/shared';

// ─── Helpers ────────────────────────────────────────────────────
const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const now = Date.now();
const mins = (n: number) => n * 60 * 1000;
const hours = (n: number) => n * 60 * mins(1);

// ─── Categories ─────────────────────────────────────────────────
export const MOCK_CATEGORIES = [
  { id: 'cat-1', name: 'Gıda & Yöresel', slug: 'gida', productCount: 124 },
  { id: 'cat-2', name: 'Zeytinyağı',     slug: 'zeytinyagi', productCount: 48 },
  { id: 'cat-3', name: 'Takı & Aksesuar', slug: 'taki', productCount: 67 },
  { id: 'cat-4', name: 'Giyim',          slug: 'giyim', productCount: 89 },
  { id: 'cat-5', name: 'Arıcılık & Bal', slug: 'aricilik', productCount: 35 },
  { id: 'cat-6', name: 'El Sanatları',   slug: 'el_sanatlari', productCount: 156 },
  { id: 'cat-7', name: 'Mobilya',        slug: 'mobilya', productCount: 42 },
  { id: 'cat-8', name: 'Bahçe & Tarım',  slug: 'bahce', productCount: 73 },
  { id: 'cat-9', name: 'Organik Kozmetik', slug: 'kozmetik', productCount: 29 },
  { id: 'cat-10', name: 'Bakır & Seramik', slug: 'seramik', productCount: 61 },
  { id: 'cat-11', name: 'Kurutulmuş Gıda', slug: 'kurutulmus', productCount: 54 },
  { id: 'cat-12', name: 'Diğer',          slug: 'diger', productCount: 112 },
];

// ─── Products ────────────────────────────────────────────────────
export const MOCK_PRODUCTS = [
  {
    id: 'prod-1',
    title: 'Soğuk Sıkım Sızma Zeytinyağı 500ml',
    description: 'Ege\'nin en bereketli zeytinlerinden el ile toplanan, soğuk sıkım yöntemiyle üretilen sızma zeytinyağı. Coğrafi işaret belgesine sahiptir.',
    price: 450,
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80',
    status: ProductStatus.ACTIVE,
    sellerId: 'seller-1',
    sellerName: 'Ege Zeytinlikleri',
    categoryId: 'cat-2',
    categoryName: 'Zeytinyağı',
    createdAt: new Date(now - hours(24)).toISOString(),
  },
  {
    id: 'prod-2',
    title: 'Hakiki Karakovan Balı 500gr',
    description: 'Doğu Karadeniz\'in yüksek yaylalarında üretilen, hiçbir katkı maddesi içermeyen saf karakovan balı.',
    price: 850,
    imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=80',
    status: 'active',
    sellerId: 'seller-2',
    sellerName: 'Karadeniz Arıcılık',
    categoryId: 'cat-5',
    categoryName: 'Arıcılık & Bal',
    createdAt: new Date(now - hours(12)).toISOString(),
  },
  {
    id: 'prod-3',
    title: 'Siirt Fıstığı 1kg',
    description: 'Siirt\'in tarihi bahçelerinden taze hasat antep fıstığı. Yüksek protein ve lezzet garantili.',
    price: 620,
    imageUrl: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400&q=80',
    status: 'active',
    sellerId: 'seller-3',
    sellerName: 'Siirt Tarım Kooperatifi',
    categoryId: 'cat-1',
    categoryName: 'Gıda & Yöresel',
    createdAt: new Date(now - hours(6)).toISOString(),
  },
  {
    id: 'prod-4',
    title: 'El Dokuma Kilim 120x180cm',
    description: 'Anadolu motiflerini taşıyan, geleneksel yöntemlerle el ile dokunan kilim. Yün iplik kullanılmıştır.',
    price: 3200,
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
    status: 'active',
    sellerId: 'seller-4',
    sellerName: 'Anadolu El Sanatları',
    categoryId: 'cat-6',
    categoryName: 'El Sanatları',
    createdAt: new Date(now - hours(48)).toISOString(),
  },
  {
    id: 'prod-5',
    title: 'Nevşehir Kuru Kayısı 1kg',
    description: 'Güneşte kurutulmuş, katkısız Nevşehir kayısısı. Doğal tatlandırıcı olarak kullanıma uygundur.',
    price: 280,
    imageUrl: 'https://images.unsplash.com/photo-1593113616828-6f22bca04804?w=400&q=80',
    status: 'active',
    sellerId: 'seller-5',
    sellerName: 'Nevşehir Tarım',
    categoryId: 'cat-11',
    categoryName: 'Kurutulmuş Gıda',
    createdAt: new Date(now - hours(3)).toISOString(),
  },
  {
    id: 'prod-6',
    title: 'Bakır Çay Seti 6 Kişilik',
    description: 'Geleneksel Türk çay kültürünü yaşatacak, el işi bakır çay seti. Kalay kaplı, gıdaya uygun.',
    price: 1850,
    imageUrl: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&q=80',
    status: 'active',
    sellerId: 'seller-4',
    sellerName: 'Anadolu El Sanatları',
    categoryId: 'cat-10',
    categoryName: 'Bakır & Seramik',
    createdAt: new Date(now - hours(72)).toISOString(),
  },
];

const PRODUCT_META: Record<string, { discountRate: number; originalPrice?: number; likeCount: number }> = {
  'prod-1': { discountRate: 20, originalPrice: 450,  likeCount: 312 },
  'prod-2': { discountRate: 20, originalPrice: 850,  likeCount: 487 },
  'prod-3': { discountRate: 15, originalPrice: 620,  likeCount: 224 },
  'prod-4': { discountRate: 0,                       likeCount: 891 },
  'prod-5': { discountRate: 20, originalPrice: 280,  likeCount: 156 },
  'prod-6': { discountRate: 0,                       likeCount: 634 },
};

export const MOCK_PRODUCTS_ENRICHED = MOCK_PRODUCTS.map((p) => {
  const meta = PRODUCT_META[p.id] ?? { discountRate: 0, likeCount: 0 };
  const originalPrice = meta.originalPrice ?? p.price;
  const price = meta.discountRate > 0 ? Math.round(originalPrice * (1 - meta.discountRate / 100)) : p.price;
  return { ...p, price, originalPrice, discountRate: meta.discountRate, likeCount: meta.likeCount };
});


// ─── Auctions ────────────────────────────────────────────────────
export const MOCK_AUCTIONS = [
  {
    id: 'auc-1',
    productId: 'prod-4',
    productTitle: 'El Dokuma Kilim 120x180cm — Nadir Koleksiyon',
    productImage: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
    sellerId: 'seller-4',
    sellerName: 'Anadolu El Sanatları',
    startPrice: 2500,
    currentPrice: 3750,
    minIncrement: 100,
    buyerPremiumRate: 0.1,
    status: AuctionStatus.ACTIVE,
    startTime: new Date(now - hours(2)).toISOString(),
    endTime: new Date(now + hours(1) + mins(23)).toISOString(),
    timeLeftMs: hours(1) + mins(23),
    winnerId: null,
    bidCount: 14,
  },
  {
    id: 'auc-2',
    productId: 'prod-1',
    productTitle: 'Osmanlı Dönemi Gümüş Çerçeve',
    productImage: 'https://images.unsplash.com/photo-1543087903-1ac2ec7aa8c5?w=400&q=80',
    sellerId: 'seller-6',
    sellerName: 'Tarihi Eserler Koleksiyonu',
    startPrice: 5000,
    currentPrice: 7200,
    minIncrement: 200,
    buyerPremiumRate: 0.12,
    status: 'active' as const,
    startTime: new Date(now - hours(5)).toISOString(),
    endTime: new Date(now + mins(45)).toISOString(),
    timeLeftMs: mins(45),
    winnerId: null,
    bidCount: 22,
  },
  {
    id: 'auc-3',
    productId: 'prod-6',
    productTitle: 'Antika Bakır Mangal — 19. Yüzyıl',
    productImage: 'https://images.unsplash.com/photo-1577058231197-94b58823ba4e?w=400&q=80',
    sellerId: 'seller-4',
    sellerName: 'Anadolu El Sanatları',
    startPrice: 3000,
    currentPrice: 3000,
    minIncrement: 150,
    buyerPremiumRate: 0.1,
    status: AuctionStatus.PUBLISHED,
    startTime: new Date(now + hours(2)).toISOString(),
    endTime: new Date(now + hours(26)).toISOString(),
    timeLeftMs: hours(26),
    winnerId: null,
    bidCount: 0,
  },
  {
    id: 'auc-4',
    productId: 'prod-5',
    productTitle: 'Vintage Türk Halısı 200x300cm',
    productImage: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&q=80',
    sellerId: 'seller-7',
    sellerName: 'Istanbul Koleksiyon',
    startPrice: 8000,
    currentPrice: 11500,
    minIncrement: 500,
    buyerPremiumRate: 0.12,
    status: AuctionStatus.ENDED,
    startTime: new Date(now - hours(48)).toISOString(),
    endTime: new Date(now - hours(24)).toISOString(),
    timeLeftMs: 0,
    winnerId: 'user-mock',
    bidCount: 31,
  },
];

// ─── Bids ────────────────────────────────────────────────────────
export const MOCK_BIDS: Record<string, any[]> = {
  'auc-1': [
    { id: 'bid-1', amount: 3750, premiumAmount: 375, bidderName: 'A. Yılmaz', createdAt: new Date(now - mins(5)).toISOString() },
    { id: 'bid-2', amount: 3650, premiumAmount: 365, bidderName: 'M. Kaya',   createdAt: new Date(now - mins(12)).toISOString() },
    { id: 'bid-3', amount: 3500, premiumAmount: 350, bidderName: 'F. Demir',  createdAt: new Date(now - mins(28)).toISOString() },
    { id: 'bid-4', amount: 3200, premiumAmount: 320, bidderName: 'S. Çelik',  createdAt: new Date(now - mins(45)).toISOString() },
  ],
  'auc-2': [
    { id: 'bid-5', amount: 7200, premiumAmount: 864, bidderName: 'K. Arslan', createdAt: new Date(now - mins(3)).toISOString() },
    { id: 'bid-6', amount: 7000, premiumAmount: 840, bidderName: 'A. Yılmaz', createdAt: new Date(now - mins(9)).toISOString() },
    { id: 'bid-7', amount: 6500, premiumAmount: 780, bidderName: 'H. Şahin',  createdAt: new Date(now - mins(20)).toISOString() },
  ],
  'auc-3': [],
  'auc-4': [
    { id: 'bid-8', amount: 11500, premiumAmount: 1380, bidderName: 'Siz',      createdAt: new Date(now - hours(25)).toISOString() },
    { id: 'bid-9', amount: 11000, premiumAmount: 1320, bidderName: 'R. Doğan', createdAt: new Date(now - hours(25.2)).toISOString() },
  ],
};

// ─── Auth ────────────────────────────────────────────────────────
export const MOCK_USER = {
  id: 'user-mock',
  email: 'demo@endemigo.com',
  firstName: 'Demo',
  lastName: 'Kullanıcı',
  isSeller: false,
};

export const MOCK_WALLET = {
  walletId: 'wallet-mock',
  balance: 15000,
  held: 3750,
  available: 11250,
};

// ─── Blogs ───────────────────────────────────────────────────────
export const MOCK_BLOGS = [
  {
    id: 'blog-1',
    title: 'Anadolu\'nun Kayıp Lezzetleri: Siirt Fıstığının Sırrı',
    excerpt: 'Geleneksel tarım yöntemleriyle hasat edilen gerçek Siirt fıstığını nasıl anlarsınız? Ustalarından püf noktalar.',
    image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800&q=80',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    readTime: '4 dk okuma',
    category: 'Lezzet Sırları'
  },
  {
    id: 'blog-2',
    title: 'El Dokuması Kilimlerde Motiflerin Dili',
    excerpt: 'Anadolu kilimlerindeki her bir geometrik şekil ve rengin bir hikayesi var. İşte en yaygın motifler ve anlamları.',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    readTime: '6 dk okuma',
    category: 'El Sanatları'
  },
  {
    id: 'blog-3',
    title: 'Gerçek Soğuk Sıkım Zeytinyağını Tanıma Rehberi',
    excerpt: 'Piyasadaki sahte zeytinyağlarından korunmanın yolları ve evde yapabileceğiniz basit testler.',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    readTime: '5 dk okuma',
    category: 'Rehber'
  }
];

// ─── Mock API Service ────────────────────────────────────────────
export const mockService = {

  // Auth
  async login(email: string, _password: string) {
    await delay(600);
    if (!email.includes('@')) throw new Error('Geçersiz e-posta');
    return {
      accessToken: 'mock-jwt-token-' + Date.now(),
      user: { ...MOCK_USER, email },
    };
  },

  async register(email: string, _password: string, firstName = '', lastName = '') {
    await delay(800);
    return {
      accessToken: 'mock-jwt-token-' + Date.now(),
      user: { ...MOCK_USER, email, firstName, lastName },
    };
  },

  async getProfile() {
    await delay(300);
    return MOCK_USER;
  },

  // Products
  async getProducts(page = 1, limit = 20) {
    await delay(500);
    const start = (page - 1) * limit;
    const items = MOCK_PRODUCTS_ENRICHED.slice(start, start + limit);
    return { items, total: MOCK_PRODUCTS_ENRICHED.length, page, totalPages: Math.ceil(MOCK_PRODUCTS_ENRICHED.length / limit) };
  },

  async getDiscountedProducts() {
    await delay(400);
    return MOCK_PRODUCTS_ENRICHED.filter((p) => p.discountRate > 0)
      .sort((a, b) => b.discountRate - a.discountRate);
  },

  async getMostLikedProducts() {
    await delay(400);
    return [...MOCK_PRODUCTS_ENRICHED].sort((a, b) => b.likeCount - a.likeCount);
  },

  async getProduct(id: string) {
    await delay(400);
    const product = MOCK_PRODUCTS_ENRICHED.find((p) => p.id === id);
    if (!product) throw new Error('Ürün bulunamadı');
    return product;
  },

  // Categories
  async getCategories() {
    await delay(300);
    return MOCK_CATEGORIES;
  },

  // Blogs
  async getBlogs() {
    await delay(400);
    return MOCK_BLOGS;
  },

  // Auctions
  async getAuctions(page = 1, limit = 20) {
    await delay(500);
    const start = (page - 1) * limit;
    const items = MOCK_AUCTIONS.slice(start, start + limit);
    return { items, total: MOCK_AUCTIONS.length, page, totalPages: 1 };
  },

  async getAuction(id: string) {
    await delay(400);
    const auction = MOCK_AUCTIONS.find((a) => a.id === id);
    if (!auction) throw new Error('Müzayede bulunamadı');
    return {
      ...auction,
      timeLeftMs: Math.max(0, new Date(auction.endTime).getTime() - Date.now()),
    };
  },

  async getAuctionBids(id: string) {
    await delay(300);
    return MOCK_BIDS[id] || [];
  },

  async getAuctionResult(id: string) {
    await delay(400);
    const auction = MOCK_AUCTIONS.find((a) => a.id === id);
    if (!auction || auction.status !== AuctionStatus.ENDED) throw new Error('Sonuç bulunamadı');
    const bids = MOCK_BIDS[id] || [];
    return {
      id: auction.id,
      status: AuctionStatus.ENDED,
      finalPrice: auction.currentPrice,
      buyerPremium: Math.round(auction.currentPrice * auction.buyerPremiumRate),
      bidCount: auction.bidCount,
      winner: auction.winnerId ? { id: auction.winnerId, name: bids[0]?.bidderName || 'Kazanan' } : null,
      product: { id: auction.productId, title: auction.productTitle },
    };
  },

  async placeBid(auctionId: string, amount: number) {
    await delay(600);
    const auction = MOCK_AUCTIONS.find((a) => a.id === auctionId);
    if (!auction) throw new Error('Müzayede bulunamadı');
    if (amount <= auction.currentPrice) throw new Error(`Teklif mevcut fiyattan yüksek olmalı: ₺${auction.currentPrice}`);
    auction.currentPrice = amount;
    auction.bidCount++;
    const newBid = {
      id: 'bid-new-' + Date.now(),
      amount,
      premiumAmount: Math.round(amount * auction.buyerPremiumRate),
      bidderName: 'Siz',
      createdAt: new Date().toISOString(),
    };
    if (!MOCK_BIDS[auctionId]) MOCK_BIDS[auctionId] = [];
    MOCK_BIDS[auctionId].unshift(newBid);
    return newBid;
  },

  // Wallet
  async getWalletBalance() {
    await delay(300);
    return MOCK_WALLET;
  },

  // Seller actions
  async becomeSeller() {
    await delay(500);
    return { ...MOCK_USER, isSeller: true };
  },
};
