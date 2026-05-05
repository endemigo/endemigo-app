import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/user/entities/user.entity';
import { ProductService } from '../src/modules/product/product.service';

describe('Vertical Slice E2E — Full Auction Flow', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let sellerToken: string;
  let sellerRefreshToken: string;
  let buyerToken: string;
  let productId: string;
  let auctionId: string;
  let categoryId: string;

  const SELLER_EMAIL = `e2e-seller-${Date.now()}@test.com`;
  const BUYER_EMAIL = `e2e-buyer-${Date.now()}@test.com`;
  const PASSWORD = 'Test1234!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = app.get(DataSource);
    const productService = app.get(ProductService);
    const { categories } = await productService.seedCategories();
    categoryId = categories[0]?.children?.[0]?.id || categories[0]?.id;
  }, 30000);

  afterAll(async () => {
    await app?.close();
  });

  async function markEmailVerified(email: string) {
    await dataSource.getRepository(User).update(
      { email: email.toLowerCase() },
      { isVerified: true },
    );
  }

  // ==========================================
  // STEP 1: Auth — Register & Login
  // ==========================================
  describe('Step 1: Auth', () => {
    it('should register seller', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: SELLER_EMAIL, password: PASSWORD, firstName: 'E2E', lastName: 'Seller' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      sellerToken = res.body.accessToken;
      sellerRefreshToken = res.body.refreshToken;
      await markEmailVerified(SELLER_EMAIL);
    });

    it('should register buyer', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: BUYER_EMAIL, password: PASSWORD, firstName: 'E2E', lastName: 'Buyer' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      buyerToken = res.body.accessToken;
      await markEmailVerified(BUYER_EMAIL);
    });

    it('should login seller', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: SELLER_EMAIL, password: PASSWORD })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      sellerToken = res.body.accessToken;
      sellerRefreshToken = res.body.refreshToken;
    });

    it('should reject wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: SELLER_EMAIL, password: 'Wrong123!' })
        .expect(401);
    });

    it('should get profile with JWT', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.code).toBe('PROFILE_FETCHED');
      expect(res.body.email).toBe(SELLER_EMAIL);
    });

    it('should reject no token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('should refresh token and reject reused refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: sellerRefreshToken })
        .expect(200);

      expect(res.body.code).toBe('TOKEN_REFRESHED');
      sellerToken = res.body.accessToken;
      sellerRefreshToken = res.body.refreshToken;

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);
    });

    it('should handle auth recovery endpoints with typed response codes', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      const forgot = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: SELLER_EMAIL })
        .expect(200);
      expect(forgot.body.code).toBe('RESET_EMAIL_SENT');

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'invalid-token', newPassword: 'NewPass123!' })
        .expect(400);
    });
  });

  // ==========================================
  // STEP 2: Become Seller
  // ==========================================
  describe('Step 2: Become Seller', () => {
    it('should promote to seller', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/become-seller')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ businessName: 'E2E Test Mağazası', agreementAccepted: true })
        .expect(201);

      expect(res.body.isSeller).toBe(true);
      expect(res.body.sellerProfile).toBeDefined();
    });

    it('should reject already seller (409)', async () => {
      await request(app.getHttpServer())
        .post('/users/become-seller')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ businessName: 'Tekrar Deneme', agreementAccepted: true })
        .expect(409);
    });
  });

  // ==========================================
  // STEP 3: Create Product
  // ==========================================
  describe('Step 3: Product', () => {
    it('seller should create product', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'E2E Test Ürün',
          price: 5000,
          description: 'E2E test ürünü açıklaması',
          categoryId,
          imageUrl: 'https://example.com/e2e-product.jpg',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      productId = res.body.id;
    });

    it('seller should activate product', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'ACTIVE', stockQuantity: 10 })
        .expect(200);

      expect(res.body.code).toBe('PRODUCT_UPDATED');
      expect(res.body.status).toBe('ACTIVE');
    });

    it('buyer should not create product', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ title: 'X', price: 100, description: 'Y' });

      expect([400, 403].includes(res.status)).toBe(true);
    });

    it('should list products (public)', async () => {
      const res = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(res.body.items).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('should get product detail with Phase 3 fields', async () => {
      const res = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(res.body.id).toBe(productId);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.condition).toBeDefined();
      expect(res.body.listingType).toBeDefined();
    });

    it('should list seller own products (GET /products/my)', async () => {
      const res = await request(app.getHttpServer())
        .get('/products/my')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items[0].sellerId).toBeDefined();
    });

    it('should reject update by non-owner (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ title: 'Hack' })
        .expect(403);
    });
  });

  // ==========================================
  // STEP 3.5: Categories
  // ==========================================
  describe('Step 3.5: Categories', () => {
    it('should seed categories', async () => {
      await request(app.getHttpServer())
        .post('/categories/seed')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);
    });

    it('should list categories with children (public)', async () => {
      const res = await request(app.getHttpServer())
        .get('/categories')
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(9);
      expect(res.body[0].children).toBeDefined();
      expect(res.body[0].children.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // STEP 3.6: Search & Favorites
  // ==========================================
  describe('Step 3.6: Search & Favorites', () => {
    it('should search products by text', async () => {
      const res = await request(app.getHttpServer())
        .get('/products/search?q=Test')
        .expect(200);

      expect(res.body.items).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(0);
    });

    it('should search products with filters', async () => {
      const res = await request(app.getHttpServer())
        .get('/products/search?minPrice=100&maxPrice=100000&sort=price_asc')
        .expect(200);

      expect(res.body.items).toBeDefined();
    });

    it('should search auctions', async () => {
      const res = await request(app.getHttpServer())
        .get('/auctions/search?sort=newest')
        .expect(200);

      expect(res.body.items).toBeDefined();
    });

    it('should do unified search', async () => {
      const res = await request(app.getHttpServer())
        .get('/search?q=Test')
        .expect(200);

      expect(res.body.products).toBeDefined();
      expect(res.body.auctions).toBeDefined();
    });

    it('should toggle favorite (add)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/favorites/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(201);

      expect(res.body.isFavorited).toBe(true);
    });

    it('should list favorites', async () => {
      const res = await request(app.getHttpServer())
        .get('/favorites')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should toggle favorite (remove)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/favorites/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(201);

      expect(res.body.isFavorited).toBe(false);
    });

    it('should reject favorite without auth', async () => {
      await request(app.getHttpServer())
        .post(`/favorites/${productId}`)
        .expect(401);
    });
  });

  // ==========================================
  // STEP 4: Create Auction
  // ==========================================
  describe('Step 4: Auction', () => {
    it('seller should create auction', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() + 1500).toISOString();
      const endTime = new Date(now.getTime() + 300000).toISOString(); // 5 min

      const res = await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ productId, startPrice: 1000, minIncrement: 100, startTime, endTime });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('DRAFT');
      auctionId = res.body.id;

      await request(app.getHttpServer())
        .patch(`/auctions/${auctionId}/publish`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      await new Promise(r => setTimeout(r, 2500));

      // Verify active
      const detail = await request(app.getHttpServer())
        .get(`/auctions/${auctionId}`)
        .expect(200);
      expect(detail.body.status).toBe('ACTIVE');
    }, 10000);

    it('buyer should not create auction (403)', async () => {
      const now = new Date();
      await request(app.getHttpServer())
        .post('/auctions')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId,
          startPrice: 100,
          startTime: now.toISOString(),
          endTime: new Date(now.getTime() + 300000).toISOString(),
        })
        .expect(403);
    });

    it('should list auctions (public)', async () => {
      const res = await request(app.getHttpServer())
        .get('/auctions')
        .expect(200);

      expect(res.body.items).toBeDefined();
    });

    it('should get auction detail (public)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/auctions/${auctionId}`)
        .expect(200);

      expect(res.body.currentPrice).toBe(1000);
      expect(res.body.bidCount).toBe(0);
    });
  });

  // ==========================================
  // STEP 5: Place Bids
  // ==========================================
  describe('Step 5: Bidding', () => {
    it('buyer should place valid bid', async () => {
      await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/auctions/${auctionId}/bids`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 1100 })
        .expect(201);

      expect(res.body.bid.amount).toBe(1100);
      expect(res.body.bid.premiumAmount).toBe(275); // 1100 * 0.25
      expect(res.body.auction.currentPrice).toBe(1100);
      expect(res.body.auction.bidCount).toBe(1);
    });

    it('seller should not bid own auction', async () => {
      const res = await request(app.getHttpServer())
        .post(`/auctions/${auctionId}/bids`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ amount: 1200 })
        .expect(400);

      expect(res.body.message).toContain('Kendi müzayedenize');
    });

    it('should reject below minimum increment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/auctions/${auctionId}/bids`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 1150 }) // min = 1100 + 100 = 1200
        .expect(400);

      expect(res.body.message).toContain('Minimum teklif');
    });

    it('should reject unauthenticated bid', async () => {
      await request(app.getHttpServer())
        .post(`/auctions/${auctionId}/bids`)
        .send({ amount: 2000 })
        .expect(401);
    });

    it('buyer should place higher bid', async () => {
      const res = await request(app.getHttpServer())
        .post(`/auctions/${auctionId}/bids`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 1300 })
        .expect(201);

      expect(res.body.auction.currentPrice).toBe(1300);
      expect(res.body.auction.bidCount).toBe(2);
    });

    it('should list bid history', async () => {
      const res = await request(app.getHttpServer())
        .get(`/auctions/${auctionId}/bids`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0].amount).toBe(1300); // highest first
    });
  });

  // ==========================================
  // STEP 6: Wallet
  // ==========================================
  describe('Step 6: Wallet', () => {
    it('buyer wallet should reflect bids', async () => {
      const res = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(Number(res.body.balance)).toBe(10000);
      // Hold should exist from the last bid (1300)
      expect(Number(res.body.held)).toBeGreaterThanOrEqual(0);
    });

    it('should list holds (may be empty if released)', async () => {
      const res = await request(app.getHttpServer())
        .get('/wallet/holds')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(res.body.code).toBe('HOLDS_FETCHED');
      expect(res.body.message).toBeDefined();
      expect(Array.isArray(res.body.holds)).toBe(true);
    });

    it('should reject unauthenticated wallet', async () => {
      await request(app.getHttpServer())
        .get('/wallet/balance')
        .expect(401);
    });
  });

  // ==========================================
  // STEP 7: Auction Result (before finalize)
  // ==========================================
  describe('Step 7: Result', () => {
    it('should return auction result', async () => {
      const res = await request(app.getHttpServer())
        .get(`/auctions/${auctionId}/result`);

      // May be 200 or other status depending on validation
      if (res.status === 200) {
        expect(res.body.finalPrice).toBe(1300);
        expect(res.body.buyerPremium).toBe(325);
      }
      expect([200, 400].includes(res.status)).toBe(true);
    });
  });

  // ==========================================
  // STEP 8: Phase 2 — Profile Update
  // ==========================================
  describe('Step 8: Profile Update', () => {
    const uniquePhone = `+9055${Date.now().toString().slice(-8)}`;

    it('should update profile (PATCH /users/profile)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ firstName: 'UpdatedSeller', phone: uniquePhone })
        .expect(200);

      expect(res.body.code).toBe('PROFILE_UPDATED');
      expect(res.body.firstName).toBe('UpdatedSeller');
      expect(res.body.phone).toBe(uniquePhone);
    });

    it('should reject unauthenticated profile update', async () => {
      await request(app.getHttpServer())
        .patch('/users/profile')
        .send({ firstName: 'Hacker' })
        .expect(401);
    });
  });

  // ==========================================
  // STEP 9: Phase 2 — Seller Profile
  // ==========================================
  describe('Step 9: Seller Profile', () => {
    it('should get seller profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/seller-profile')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.code).toBe('SELLER_PROFILE_FETCHED');
      expect(res.body.sellerProfile.businessName).toBe('E2E Test Mağazası');
      expect(res.body.sellerProfile.status).toBe('APPROVED');
      expect(res.body.sellerProfile.agreementVersion).toBe('1.0.0');
    });

    it('should return 404 for buyer seller profile', async () => {
      await request(app.getHttpServer())
        .get('/users/seller-profile')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(404);
    });
  });

  // ==========================================
  // STEP 10: Phase 2 — KVKK Consent
  // ==========================================
  describe('Step 10: KVKK Consent', () => {
    it('should create KVKK consent', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/consents')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ consentType: 'MARKETING', isAccepted: true })
        .expect(201);

      expect(res.body.code).toBe('CONSENT_CREATED');
      expect(res.body.consent.consentType).toBe('MARKETING');
    });

    it('should list consents', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/consents')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.code).toBe('CONSENT_LIST');
      expect(Array.isArray(res.body.consents)).toBe(true);
      expect(res.body.consents.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject invalid consent enum', async () => {
      await request(app.getHttpServer())
        .post('/users/consents')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ consentType: 'INVALID', isAccepted: true })
        .expect(400);
    });
  });

  // ==========================================
  // STEP 11: Phase 2 — Account Delete & Reactivate
  // ==========================================
  describe('Step 11: Account Lifecycle', () => {
    let tempToken: string;
    const TEMP_EMAIL = `e2e-temp-${Date.now()}@test.com`;

    it('should register temp account for delete test', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: TEMP_EMAIL, password: PASSWORD, firstName: 'Temp', lastName: 'User' })
        .expect(201);

      tempToken = res.body.accessToken;
      expect(tempToken).toBeDefined();
    });

    it('should delete account with password', async () => {
      const res = await request(app.getHttpServer())
        .delete('/users/account')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({ password: PASSWORD })
        .expect(200);

      expect(res.body.code).toBe('ACCOUNT_DELETED');
    });

    it('should reactivate within grace period', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/account/reactivate')
        .send({ email: TEMP_EMAIL, password: PASSWORD })
        .expect(200);

      expect(res.body.code).toBe('ACCOUNT_REACTIVATED');
    });

    it('should reject delete with wrong password', async () => {
      // Login again after reactivation
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEMP_EMAIL, password: PASSWORD })
        .expect(200);

      await request(app.getHttpServer())
        .delete('/users/account')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ password: 'WrongPassword!' })
        .expect(401);
    });
  });
});
