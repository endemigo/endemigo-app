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
import { AuctionPaymentStatus, AuctionStatus, ProductStatus } from '@endemigo/shared';
import { resolveSellerBanner } from '../utils/sellerBanner';
import type { ProductCreateImageDraft } from '../types/productCreate';

// ─── Helpers ────────────────────────────────────────────────────
const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const now = Date.now();
const mins = (n: number) => n * 60 * 1000;
const hours = (n: number) => n * 60 * mins(1);

interface MockBid {
  id: string;
  bidderId?: string;
  amount: number;
  maxAmount?: number | null;
  premiumAmount: number;
  bidderName: string;
  status?: string;
  isWinningBid?: boolean;
  createdAt: string;
}

interface MockAuction {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  sellerId: string;
  sellerName: string;
  startPrice: number;
  currentPrice: number;
  minIncrement: number;
  reservePrice: number | null;
  reserveMet: boolean;
  buyerPremiumRate: number;
  status: AuctionStatus;
  startTime: string;
  endTime: string;
  timeLeftMs: number;
  winnerId: string | null;
  winnerPaymentStatus: AuctionPaymentStatus;
  winnerPaymentDeadlineAt: string | null;
  winnerPaymentCompletedAt: string | null;
  fallbackRound: number;
  paymentAttemptCount: number;
  orderId: string | null;
  bidCount: number;
}

// ─── Categories ─────────────────────────────────────────────────
export const MOCK_CATEGORIES = [
  { id: 'cat-1', name: 'Elektronik', slug: 'elektronik', productCount: 124, imageUrl: 'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?w=600&q=80' },
  { id: 'cat-2', name: 'Antika & Koleksiyon', slug: 'antika-koleksiyon', productCount: 48, imageUrl: 'https://images.unsplash.com/photo-1462212210333-335063b67695?w=600&q=80' },
  { id: 'cat-3', name: 'Sanat', slug: 'sanat', productCount: 67, imageUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&q=80' },
  { id: 'cat-4', name: 'Halı & Kilim', slug: 'hali-kilim', productCount: 89, imageUrl: 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=600&q=80' },
  { id: 'cat-5', name: 'Mücevher & Saat', slug: 'mucevher-saat', productCount: 35, imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80' },
  { id: 'cat-6', name: 'Mobilya & Dekor', slug: 'mobilya-dekor', productCount: 156, imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80' },
  { id: 'cat-7', name: 'Kıyafet & Aksesuar', slug: 'kiyafet-aksesuar', productCount: 42, imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&q=80' },
  { id: 'cat-8', name: 'Spor & Outdoor', slug: 'spor-outdoor', productCount: 73, imageUrl: 'https://images.unsplash.com/photo-1530137073520-13c9f3078f2d?w=600&q=80' },
  { id: 'cat-9', name: 'Yöresel Ürünler', slug: 'yoresel-urunler', productCount: 29, imageUrl: 'https://images.unsplash.com/photo-1506617564039-2f3b650b7010?w=600&q=80' },
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
    geoIndicationCertNo: 'TR-CI-2026-001',
    geoIndicationRegion: 'Ayvalık',
    createdAt: new Date(now - hours(24)).toISOString(),
  },
  {
    id: 'prod-2',
    title: 'Hakiki Karakovan Balı 500gr',
    description: 'Doğu Karadeniz\'in yüksek yaylalarında üretilen, hiçbir katkı maddesi içermeyen saf karakovan balı.',
    price: 850,
    imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=80',
    status: ProductStatus.ACTIVE,
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
    status: ProductStatus.ACTIVE,
    sellerId: 'seller-3',
    sellerName: 'Siirt Tarım Kooperatifi',
    categoryId: 'cat-1',
    categoryName: 'Gıda & Yöresel',
    geoIndicationRegion: 'Siirt',
    createdAt: new Date(now - hours(6)).toISOString(),
  },
  {
    id: 'prod-4',
    title: 'El Dokuma Kilim 120x180cm',
    description: 'Anadolu motiflerini taşıyan, geleneksel yöntemlerle el ile dokunan kilim. Yün iplik kullanılmıştır.',
    price: 3200,
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
    status: ProductStatus.ACTIVE,
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
    status: ProductStatus.ACTIVE,
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
    status: ProductStatus.ACTIVE,
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

function resolveCategoryName(categoryId: string) {
  return MOCK_CATEGORIES.find((category) => category.id === categoryId)?.name ?? categoryId;
}


// ─── Auctions ────────────────────────────────────────────────────
export const MOCK_AUCTIONS: MockAuction[] = [
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
    reservePrice: 3600,
    reserveMet: true,
    buyerPremiumRate: 0.1,
    status: AuctionStatus.ACTIVE,
    startTime: new Date(now - hours(2)).toISOString(),
    endTime: new Date(now + hours(1) + mins(23)).toISOString(),
    timeLeftMs: hours(1) + mins(23),
    winnerId: null,
    winnerPaymentStatus: AuctionPaymentStatus.NONE,
    winnerPaymentDeadlineAt: null,
    winnerPaymentCompletedAt: null,
    fallbackRound: 0,
    paymentAttemptCount: 0,
    orderId: null,
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
    reservePrice: 8000,
    reserveMet: false,
    buyerPremiumRate: 0.12,
    status: AuctionStatus.ACTIVE,
    startTime: new Date(now - hours(5)).toISOString(),
    endTime: new Date(now + mins(45)).toISOString(),
    timeLeftMs: mins(45),
    winnerId: null,
    winnerPaymentStatus: AuctionPaymentStatus.NONE,
    winnerPaymentDeadlineAt: null,
    winnerPaymentCompletedAt: null,
    fallbackRound: 0,
    paymentAttemptCount: 0,
    orderId: null,
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
    reservePrice: 4200,
    reserveMet: false,
    buyerPremiumRate: 0.1,
    status: AuctionStatus.PUBLISHED,
    startTime: new Date(now + hours(2)).toISOString(),
    endTime: new Date(now + hours(26)).toISOString(),
    timeLeftMs: hours(26),
    winnerId: null,
    winnerPaymentStatus: AuctionPaymentStatus.NONE,
    winnerPaymentDeadlineAt: null,
    winnerPaymentCompletedAt: null,
    fallbackRound: 0,
    paymentAttemptCount: 0,
    orderId: null,
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
    reservePrice: 11000,
    reserveMet: true,
    buyerPremiumRate: 0.12,
    status: AuctionStatus.ENDED,
    startTime: new Date(now - hours(48)).toISOString(),
    endTime: new Date(now - hours(24)).toISOString(),
    timeLeftMs: 0,
    winnerId: 'user-mock',
    winnerPaymentStatus: AuctionPaymentStatus.PENDING,
    winnerPaymentDeadlineAt: new Date(now + hours(20)).toISOString(),
    winnerPaymentCompletedAt: null,
    fallbackRound: 0,
    paymentAttemptCount: 0,
    orderId: null,
    bidCount: 31,
  },
];

// ─── Bids ────────────────────────────────────────────────────────
export const MOCK_BIDS: Record<string, MockBid[]> = {
  'auc-1': [
    { id: 'bid-1', bidderId: 'bidder-1', amount: 3750, maxAmount: 4300, premiumAmount: 375, bidderName: 'A. Yılmaz', status: 'ACTIVE', isWinningBid: true, createdAt: new Date(now - mins(5)).toISOString() },
    { id: 'bid-2', bidderId: 'bidder-2', amount: 3650, maxAmount: 3650, premiumAmount: 365, bidderName: 'M. Kaya', status: 'OUTBID', isWinningBid: false, createdAt: new Date(now - mins(12)).toISOString() },
    { id: 'bid-3', bidderId: 'bidder-3', amount: 3500, maxAmount: 3500, premiumAmount: 350, bidderName: 'F. Demir', status: 'OUTBID', isWinningBid: false, createdAt: new Date(now - mins(28)).toISOString() },
    { id: 'bid-4', bidderId: 'bidder-4', amount: 3200, maxAmount: 3200, premiumAmount: 320, bidderName: 'S. Çelik', status: 'OUTBID', isWinningBid: false, createdAt: new Date(now - mins(45)).toISOString() },
  ],
  'auc-2': [
    { id: 'bid-5', bidderId: 'bidder-5', amount: 7200, maxAmount: 7200, premiumAmount: 864, bidderName: 'K. Arslan', status: 'ACTIVE', isWinningBid: true, createdAt: new Date(now - mins(3)).toISOString() },
    { id: 'bid-6', bidderId: 'bidder-1', amount: 7000, maxAmount: 7000, premiumAmount: 840, bidderName: 'A. Yılmaz', status: 'OUTBID', isWinningBid: false, createdAt: new Date(now - mins(9)).toISOString() },
    { id: 'bid-7', bidderId: 'bidder-6', amount: 6500, maxAmount: 6500, premiumAmount: 780, bidderName: 'H. Şahin', status: 'OUTBID', isWinningBid: false, createdAt: new Date(now - mins(20)).toISOString() },
  ],
  'auc-3': [],
  'auc-4': [
    { id: 'bid-8', bidderId: 'user-mock', amount: 11500, maxAmount: 11500, premiumAmount: 1380, bidderName: 'Siz', status: 'WON', isWinningBid: true, createdAt: new Date(now - hours(25)).toISOString() },
    { id: 'bid-9', bidderId: 'bidder-7', amount: 11000, maxAmount: 11000, premiumAmount: 1320, bidderName: 'R. Doğan', status: 'OUTBID', isWinningBid: false, createdAt: new Date(now - hours(25.2)).toISOString() },
  ],
};

function getBidMaxAmount(bid?: MockBid | null): number {
  if (!bid) {
    return 0;
  }
  return Number(bid.maxAmount ?? bid.amount);
}

function isReserveMet(reservePrice: number | null | undefined, leadingMaxAmount: number): boolean {
  return reservePrice !== null
    && reservePrice !== undefined
    && leadingMaxAmount >= reservePrice;
}

function calculateVisibleWinningAmount(input: {
  leadingMaxAmount: number;
  challengerMaxAmount?: number;
  requestedAmount: number;
  minimumBid: number;
  minIncrement: number;
}): number {
  const challengerPressure = input.challengerMaxAmount !== undefined
    ? input.challengerMaxAmount + input.minIncrement
    : 0;
  const nextVisibleAmount = Math.max(
    input.minimumBid,
    input.requestedAmount,
    challengerPressure,
  );
  return Math.min(input.leadingMaxAmount, nextVisibleAmount);
}

function markLeadingBid(auctionId: string, leadingBidId: string | null) {
  const bids = MOCK_BIDS[auctionId] ?? [];
  bids.forEach((bid) => {
    const isLeadingBid = bid.id === leadingBidId;
    bid.isWinningBid = isLeadingBid;
    bid.status = isLeadingBid ? 'ACTIVE' : 'OUTBID';
  });
}

// ─── Auth ────────────────────────────────────────────────────────
export const MOCK_USER = {
  id: 'user-mock',
  email: 'demo@endemigo.com',
  firstName: 'Demo',
  lastName: 'Kullanıcı',
  isSeller: false,
};

export const MOCK_APPROVED_SELLER_USER = {
  id: 'user-seller-approved',
  email: 'a@a.com',
  firstName: 'Ahmet',
  lastName: 'Aydın',
  isSeller: true,
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
  async login(email: string, password: string) {
    await delay(600);
    if (!email.includes('@')) throw new Error('Geçersiz e-posta');
    if (email === MOCK_APPROVED_SELLER_USER.email) {
      if (password !== '123123') {
        throw new Error('E-posta veya şifre hatalı');
      }
      return {
        accessToken: 'mock-jwt-token-' + Date.now(),
        user: MOCK_APPROVED_SELLER_USER,
      };
    }
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

  async getMyProducts(page = 1, limit = 20) {
    await delay(350);
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

  async createProduct(payload: {
    title: string;
    description?: string;
    price: number;
    categoryId: string;
    stockQuantity: number;
    listingType: string;
    condition: string;
    askPriceEnabled?: boolean;
    askPriceMinAmount?: number;
    geoIndicationCertNo?: string;
    geoIndicationRegion?: string;
  }) {
    await delay(250);
    const createdProduct = {
      id: `prod-mock-${Date.now()}`,
      title: payload.title,
      description: payload.description ?? '',
      price: payload.price,
      originalPrice: payload.price,
      discountRate: 0,
      likeCount: 0,
      imageUrl: '',
      thumbnail: '',
      images: [],
      status: ProductStatus.DRAFT,
      sellerId: 'seller-mock',
      sellerName: 'Siz',
      categoryId: payload.categoryId,
      categoryName: resolveCategoryName(payload.categoryId),
      listingType: payload.listingType as never,
      condition: payload.condition as never,
      askPriceEnabled: payload.askPriceEnabled ?? false,
      askPriceMinAmount: payload.askPriceMinAmount ?? null,
      geoIndicationCertNo: payload.geoIndicationCertNo ?? null,
      geoIndicationRegion: payload.geoIndicationRegion ?? null,
      createdAt: new Date().toISOString(),
      stockQuantity: payload.stockQuantity,
    } as (typeof MOCK_PRODUCTS_ENRICHED)[number];

    MOCK_PRODUCTS_ENRICHED.unshift(createdProduct);
    return {
      id: createdProduct.id,
      code: 'PRODUCT_CREATED',
      message: 'Mock product created.',
    };
  },

  async uploadProductImage(productId: string, image: ProductCreateImageDraft) {
    await delay(120);
    const product = MOCK_PRODUCTS_ENRICHED.find((item) => item.id === productId) as
      | ((typeof MOCK_PRODUCTS_ENRICHED)[number] & { images?: Array<{ id: string; url: string; sortOrder: number; isPrimary: boolean }>; thumbnail?: string })
      | undefined;
    if (!product) {
      throw new Error('Ürün bulunamadı');
    }

    const nextImage = {
      id: `${productId}-image-${Date.now()}`,
      url: image.uri,
      sortOrder: product.images?.length ?? 0,
      isPrimary: (product.images?.length ?? 0) === 0,
    };

    product.images = [...(product.images ?? []), nextImage];
    product.imageUrl = product.imageUrl ?? image.uri;
    product.thumbnail = product.thumbnail ?? image.uri;
  },

  async publishProduct(productId: string) {
    await delay(120);
    const product = MOCK_PRODUCTS_ENRICHED.find((item) => item.id === productId);
    if (!product) {
      throw new Error('Ürün bulunamadı');
    }

    product.status = ProductStatus.ACTIVE;
    return {
      id: productId,
      code: 'PRODUCT_PUBLISHED',
      message: 'Mock product published.',
    };
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

  async searchProducts(query: {
    q?: string;
    categoryId?: string;
    sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
    limit?: number;
  }) {
    await delay(250);
    const normalizedQuery = query.q?.trim().toLocaleLowerCase() ?? '';
    let items = [...MOCK_PRODUCTS_ENRICHED];

    if (normalizedQuery) {
      items = items.filter((item) =>
        `${item.title} ${item.description} ${item.categoryName}`
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      );
    }

    if (query.categoryId) {
      items = items.filter((item) => item.categoryId === query.categoryId);
    }

    switch (query.sort) {
      case 'price_asc':
        items.sort((left, right) => (left.price ?? 0) - (right.price ?? 0));
        break;
      case 'price_desc':
        items.sort((left, right) => (right.price ?? 0) - (left.price ?? 0));
        break;
      case 'popular':
        items.sort((left, right) => (right.likeCount ?? 0) - (left.likeCount ?? 0));
        break;
      default:
        items.sort(
          (left, right) =>
            new Date(right.createdAt ?? '').getTime() -
            new Date(left.createdAt ?? '').getTime(),
        );
    }

    const limit = query.limit ?? 20;
    return {
      code: 'SEARCH_PRODUCTS_SUCCESS',
      message: 'Mock urun arama sonuclari',
      items: items.slice(0, limit).map((item) => ({
        ...item,
        favoriteCount: item.likeCount,
        isFavorited: false,
      })),
      total: items.length,
      page: 1,
      totalPages: 1,
    };
  },

  async searchAuctions(query: {
    q?: string;
    sort?: 'ending_soon' | 'newest' | 'price_asc' | 'most_bids';
    limit?: number;
  }) {
    await delay(250);
    const normalizedQuery = query.q?.trim().toLocaleLowerCase() ?? '';
    let items = [...MOCK_AUCTIONS];

    if (normalizedQuery) {
      items = items.filter((item) =>
        item.productTitle.toLocaleLowerCase().includes(normalizedQuery),
      );
    }

    switch (query.sort) {
      case 'ending_soon':
        items.sort(
          (left, right) =>
            new Date(left.endTime).getTime() - new Date(right.endTime).getTime(),
        );
        break;
      case 'price_asc':
        items.sort((left, right) => left.currentPrice - right.currentPrice);
        break;
      case 'most_bids':
        items.sort((left, right) => right.bidCount - left.bidCount);
        break;
      default:
        items.sort(
          (left, right) =>
            new Date(right.startTime).getTime() -
            new Date(left.startTime).getTime(),
        );
    }

    const limit = query.limit ?? 20;
    return {
      code: 'SEARCH_AUCTIONS_SUCCESS',
      message: 'Mock muzayede arama sonuclari',
      items: items.slice(0, limit).map((item) => ({
        id: item.id,
        productTitle: item.productTitle,
        productImageUrl: item.productImage,
        categoryName: resolveCategoryName(
          MOCK_PRODUCTS_ENRICHED.find((product) => product.id === item.productId)?.categoryId ?? '',
        ),
        startPrice: item.startPrice,
        currentPrice: item.currentPrice,
        reservePrice: item.reservePrice,
        reserveMet: item.reserveMet,
        bidCount: item.bidCount,
        status: item.status,
        startTime: item.startTime,
        endTime: item.endTime,
      })),
      total: items.length,
      page: 1,
      totalPages: 1,
    };
  },

  async getFavorites() {
    await delay(220);
    const items = MOCK_PRODUCTS_ENRICHED.slice(0, 3).map((item) => ({
      ...item,
      favoriteCount: item.likeCount,
      isFavorited: true,
    }));
    return {
      code: 'FAVORITES_LISTED',
      message: 'Mock favoriler listelendi',
      items,
      total: items.length,
      page: 1,
      totalPages: 1,
    };
  },

  async toggleFavorite(productId: string) {
    await delay(160);
    const product = MOCK_PRODUCTS_ENRICHED.find((item) => item.id === productId);
    const isFavorited = Boolean(product);
    return {
      code: isFavorited ? 'FAVORITE_ADDED' : 'FAVORITE_REMOVED',
      message: isFavorited ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı',
      isFavorited,
    };
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

  async createAuction(payload: {
    productId: string;
    startPrice: number;
    minIncrement: number;
    reservePrice?: number;
    startTime: string;
    endTime: string;
  }) {
    await delay(220);
    const product = MOCK_PRODUCTS_ENRICHED.find((item) => item.id === payload.productId) as
      | ((typeof MOCK_PRODUCTS_ENRICHED)[number] & { thumbnail?: string })
      | undefined;
    if (!product) {
      throw new Error('Ürün bulunamadı');
    }

    const createdAuction = {
      id: `auc-mock-${Date.now()}`,
      productId: product.id,
      productTitle: product.title,
      productImage: product.imageUrl ?? product.thumbnail ?? '',
      sellerId: product.sellerId ?? 'seller-mock',
      sellerName: product.sellerName,
      startPrice: payload.startPrice,
      currentPrice: payload.startPrice,
      minIncrement: payload.minIncrement,
      reservePrice: payload.reservePrice ?? null,
      reserveMet: false,
      buyerPremiumRate: 0.1,
      status: AuctionStatus.PUBLISHED,
      startTime: payload.startTime,
      endTime: payload.endTime,
      timeLeftMs: Math.max(0, new Date(payload.endTime).getTime() - Date.now()),
      winnerId: null,
      winnerPaymentStatus: AuctionPaymentStatus.NONE,
      winnerPaymentDeadlineAt: null,
      winnerPaymentCompletedAt: null,
      fallbackRound: 0,
      paymentAttemptCount: 0,
      orderId: null,
      bidCount: 0,
    };

    MOCK_AUCTIONS.unshift(createdAuction);
    return {
      id: createdAuction.id,
      code: 'AUCTION_CREATED',
      message: 'Mock auction created.',
    };
  },

  async publishAuction(auctionId: string) {
    await delay(120);
    const auction = MOCK_AUCTIONS.find((item) => item.id === auctionId);
    if (!auction) {
      throw new Error('Müzayede bulunamadı');
    }

    auction.status = AuctionStatus.PUBLISHED;
    return {
      id: auctionId,
      code: 'AUCTION_PUBLISHED',
      message: 'Mock auction published.',
    };
  },

  async getAuctionBids(id: string) {
    await delay(300);
    return MOCK_BIDS[id] || [];
  },

  async getAuctionResult(id: string) {
    await delay(400);
    const auction = MOCK_AUCTIONS.find((a) => a.id === id);
    if (
      !auction ||
      ![
        AuctionStatus.ENDED,
        AuctionStatus.COMPLETED,
        AuctionStatus.FAILED,
      ].includes(auction.status)
    ) {
      throw new Error('Sonuç bulunamadı');
    }
    const bids = MOCK_BIDS[id] || [];
    const winner = auction.reserveMet && auction.winnerId
      ? { id: auction.winnerId, name: bids.find((bid) => bid.bidderId === auction.winnerId)?.bidderName || 'Kazanan' }
      : null;
    return {
      id: auction.id,
      status: auction.status,
      finalPrice: auction.currentPrice,
      buyerPremium: winner
        ? Math.round(auction.currentPrice * auction.buyerPremiumRate)
        : 0,
      bidCount: auction.bidCount,
      paymentStatus: auction.winnerPaymentStatus,
      paymentDeadlineAt: auction.winnerPaymentDeadlineAt,
      paymentCompletedAt: auction.winnerPaymentCompletedAt,
      fallbackRound: auction.fallbackRound,
      paymentAttemptCount: auction.paymentAttemptCount,
      orderId: auction.orderId,
      reservePrice: auction.reservePrice,
      reserveMet: auction.reserveMet,
      winner,
      product: { id: auction.productId, title: auction.productTitle },
    };
  },

  async completeAuctionPayment(auctionId: string) {
    await delay(350);
    const auction = MOCK_AUCTIONS.find((item) => item.id === auctionId);
    if (!auction) {
      throw new Error('Müzayede bulunamadı');
    }
    if (
      auction.status !== AuctionStatus.ENDED ||
      auction.winnerPaymentStatus !== AuctionPaymentStatus.PENDING
    ) {
      throw new Error('Kazanan ödemesi beklenmiyor');
    }

    auction.status = AuctionStatus.COMPLETED;
    auction.winnerPaymentStatus = AuctionPaymentStatus.PAID;
    auction.winnerPaymentCompletedAt = new Date().toISOString();
    auction.orderId = `order-${auction.id}`;
    auction.paymentAttemptCount += 1;

    return {
      code: 'AUCTION_WINNER_PAYMENT_COMPLETED',
      message: 'Auction winner payment completed',
      auctionId,
      orderId: auction.orderId,
      paymentStatus: auction.winnerPaymentStatus,
    };
  },

  async placeBid(auctionId: string, amount: number, maxAmount?: number) {
    await delay(600);
    const auction = MOCK_AUCTIONS.find((a) => a.id === auctionId);
    if (!auction) throw new Error('Müzayede bulunamadı');
    const minimumBid = auction.currentPrice + auction.minIncrement;
    if (amount < minimumBid) {
      throw new Error(`Minimum teklif: ₺${minimumBid}`);
    }
    if (maxAmount !== undefined && maxAmount < amount) {
      throw new Error('Maximum teklif teklif tutarindan düşük olamaz');
    }

    const submittedMaxAmount = Number(maxAmount ?? amount);
    if (!MOCK_BIDS[auctionId]) MOCK_BIDS[auctionId] = [];
    const bidList = MOCK_BIDS[auctionId];
    const previousLeadBid = bidList.find((bid) => bid.isWinningBid) ?? null;
    const previousLeadMaxAmount = getBidMaxAmount(previousLeadBid);

    if (
      previousLeadBid
      && previousLeadBid.bidderId !== 'user-mock'
      && submittedMaxAmount <= previousLeadMaxAmount
    ) {
      const effectiveCurrentPrice = calculateVisibleWinningAmount({
        leadingMaxAmount: previousLeadMaxAmount,
        challengerMaxAmount: submittedMaxAmount,
        requestedAmount: amount,
        minimumBid,
        minIncrement: auction.minIncrement,
      });

      previousLeadBid.amount = effectiveCurrentPrice;
      previousLeadBid.premiumAmount = Math.round(effectiveCurrentPrice * auction.buyerPremiumRate);
      previousLeadBid.isWinningBid = true;
      previousLeadBid.status = 'ACTIVE';

      const losingBid: MockBid = {
        id: 'bid-new-' + Date.now(),
        bidderId: 'user-mock',
        amount: submittedMaxAmount,
        maxAmount: submittedMaxAmount,
        premiumAmount: Math.round(submittedMaxAmount * auction.buyerPremiumRate),
        bidderName: 'Siz',
        status: 'OUTBID',
        isWinningBid: false,
        createdAt: new Date().toISOString(),
      };

      bidList.unshift(losingBid);
      auction.currentPrice = effectiveCurrentPrice;
      auction.bidCount += 1;
      auction.reserveMet = isReserveMet(auction.reservePrice, previousLeadMaxAmount);

      return {
        code: 'BID_ACCEPTED',
        message: 'Bid accepted',
        bid: {
          ...losingBid,
          isLeadingBid: false,
          outbidImmediately: true,
        },
        auction: {
          currentPrice: auction.currentPrice,
          bidCount: auction.bidCount,
          endTime: auction.endTime,
          serverTime: new Date().toISOString(),
          leadingBidderId: previousLeadBid.bidderId,
          reserveMet: auction.reserveMet,
        },
      };
    }

    const effectiveCurrentPrice = previousLeadBid
      && previousLeadBid.bidderId !== 'user-mock'
      ? calculateVisibleWinningAmount({
          leadingMaxAmount: submittedMaxAmount,
          challengerMaxAmount: previousLeadMaxAmount,
          requestedAmount: amount,
          minimumBid,
          minIncrement: auction.minIncrement,
        })
      : amount;

    const newBid: MockBid = {
      id: 'bid-new-' + Date.now(),
      bidderId: 'user-mock',
      amount: effectiveCurrentPrice,
      maxAmount: submittedMaxAmount,
      premiumAmount: Math.round(effectiveCurrentPrice * auction.buyerPremiumRate),
      bidderName: 'Siz',
      status: 'ACTIVE',
      isWinningBid: true,
      createdAt: new Date().toISOString(),
    };

    bidList.unshift(newBid);
    auction.currentPrice = effectiveCurrentPrice;
    auction.bidCount += 1;
    auction.winnerId = 'user-mock';
    auction.reserveMet = isReserveMet(auction.reservePrice, submittedMaxAmount);
    markLeadingBid(auctionId, newBid.id);

    return {
      code: 'BID_ACCEPTED',
      message: 'Bid accepted',
      bid: {
        ...newBid,
        isLeadingBid: true,
        outbidImmediately: false,
      },
      auction: {
        currentPrice: auction.currentPrice,
        bidCount: auction.bidCount,
        endTime: auction.endTime,
        serverTime: new Date().toISOString(),
        leadingBidderId: 'user-mock',
        reserveMet: auction.reserveMet,
      },
    };
  },

  async withdrawBid(auctionId: string) {
    await delay(350);
    const auction = MOCK_AUCTIONS.find((item) => item.id === auctionId);
    if (!auction) {
      throw new Error('Müzayede bulunamadı');
    }

    const bidList = MOCK_BIDS[auctionId] ?? [];
    if (!bidList.length) {
      throw new Error('Geri cekilebilecek aktif lider teklif bulunamadi');
    }

    bidList.shift();
    auction.bidCount = Math.max(0, auction.bidCount - 1);
    auction.currentPrice = bidList[0]?.amount ?? auction.startPrice;
    auction.winnerId = bidList[0]?.bidderId ?? null;
    auction.reserveMet = isReserveMet(
      auction.reservePrice,
      getBidMaxAmount(bidList[0]),
    );
    markLeadingBid(auctionId, bidList[0]?.id ?? null);

    return {
      code: 'BID_WITHDRAWN',
      message: 'Teklif geri cekildi',
      auctionId,
    };
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

  // Seller profile
  async getSeller(sellerId: string) {
    await delay(500);

    const sellerProducts = MOCK_PRODUCTS_ENRICHED.filter((p) => p.sellerId === sellerId);

    const sellerNames: Record<string, string> = {
      'seller-1': 'Ege Zeytinlikleri',
      'seller-2': 'Karadeniz Arıcılık',
      'seller-3': 'Siirt Tarım Kooperatifi',
      'seller-4': 'Anadolu El Sanatları',
      'seller-5': 'Nevşehir Tarım',
      'seller-6': 'Tarihi Eserler Koleksiyonu',
      'seller-7': 'Istanbul Koleksiyon',
    };

    const profile: import('@/types').SellerProfile = {
      id: sellerId,
      name: sellerNames[sellerId] || '',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(sellerNames[sellerId] || 'E')}&background=0097D8&color=fff&size=256`,
      banner: resolveSellerBanner(sellerId),
      rating: 4.8,
      reviewCount: sellerProducts.length * 12 + 8,
      productCount: sellerProducts.length,
      totalSales: sellerProducts.length * 34 + 12,
      description:
        'Üreticiden tüketiciye doğrudan ulaşım misyonuyla yola çıkan köklü bir Anadolu markası.',
      location: 'Türkiye',
      since: '2019',
      trustBadges: ['verified', 'fast_shipping', 'original'],
    };

    return { profile, products: sellerProducts };
  },
};
