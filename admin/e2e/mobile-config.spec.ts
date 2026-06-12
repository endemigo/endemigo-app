import { expect, test, type Page, type Route } from '@playwright/test';

const admin = {
  id: 'admin-1',
  email: 'admin@endemigo.test',
  displayName: 'Ops Admin',
  roles: ['SUPER_ADMIN'],
  lastLoginAt: null,
};

function createDraft() {
  return {
    schemaVersion: 1,
    home: {
      heroBanners: [
        {
          id: 'hero-buy-now',
          type: 'HERO_BANNER',
          surface: 'HOME',
          enabled: true,
          order: 1,
          audiences: ['BUYER'],
          badge: { tr: 'One Cikan', en: 'Featured' },
          title: { tr: 'Hemen Al Firsatlari', en: 'Buy Now Deals' },
          subtitle: { tr: 'Secili urunleri kacirma', en: 'Do not miss curated items' },
          imageUrl: 'https://example.com/banner.jpg',
          cta: {
            label: { tr: 'Kesfet', en: 'Explore' },
            route: '/buy-now',
          },
        },
      ],
      entryTiles: [
        {
          id: 'entry-buy-now',
          type: 'ENTRY_TILE',
          surface: 'HOME',
          enabled: true,
          order: 1,
          audiences: ['BUYER'],
          title: { tr: 'Hemen Al', en: 'Buy Now' },
          subtitle: { tr: 'Hazir ilanlar', en: 'Ready listings' },
          cta: {
            label: { tr: 'Listeye Git', en: 'Open List' },
            route: '/buy-now',
          },
        },
      ],
      sections: [
        {
          id: 'home-featured',
          type: 'HOME_SECTION',
          surface: 'HOME',
          enabled: true,
          order: 1,
          audiences: ['BUYER'],
          title: { tr: 'One Cikanlar', en: 'Featured Picks' },
          seeAllLabel: { tr: 'Tumunu Gor', en: 'See All' },
          route: '/(tabs)/categories',
        },
      ],
      promoBanners: [
        {
          id: 'promo-campaigns',
          type: 'PROMO_BANNER',
          surface: 'HOME',
          enabled: true,
          order: 1,
          audiences: ['BUYER'],
          label: { tr: 'Kampanya', en: 'Campaign' },
          title: { tr: 'Mayis Kampanyasi', en: 'May Campaign' },
          subtitle: { tr: 'Secili urunlerde avantaj', en: 'Selected product benefits' },
          cta: {
            label: { tr: 'Incele', en: 'Review' },
            route: '/campaigns',
          },
        },
      ],
      trustBlocks: [
        {
          id: 'trust-home',
          type: 'TRUST_BLOCK',
          surface: 'HOME',
          enabled: true,
          order: 1,
          audiences: ['BUYER'],
          title: { tr: 'Guvenli Alisveris', en: 'Safe Shopping' },
          subtitle: { tr: 'Onayli saticilarla ilerle', en: 'Trade with verified sellers' },
          cta: {
            label: { tr: 'Detay', en: 'Details' },
            route: '/trust',
          },
        },
      ],
    },
    cards: {
      productCard: {
        badge: { tr: 'Fiyat Sor', en: 'Ask Price' },
        ctaLabel: { tr: 'Detaya Git', en: 'See Details' },
        showCategory: true,
        showPrice: true,
        showAskPriceBadge: true,
      },
    },
    auctions: {
      listCard: {
        ctaLabel: { tr: 'Teklif Ver', en: 'Bid Now' },
        liveBadgeLabel: { tr: 'Canli', en: 'Live' },
        showBidCount: true,
        showStatusBadge: true,
        showTimer: true,
      },
    },
    listingCreate: {
      optionalFields: [
        'originRegion',
        'originCountry',
        'shippingProvince',
        'shippingDistrict',
        'shippingAddress',
        'deliveryTemplateDomestic',
        'deliveryTemplateInternational',
        'desiDomestic',
        'desiInternational',
        'wholesalePrice',
        'retailPrice',
        'sellerNotes',
        'brand',
        'isEndemigoBrandCandidate',
        'productionProvince',
        'productionDistrict',
        'productContent',
        'barcodeNo',
        'geoIndicationReceivedAt',
        'geoIndicationCertNo',
        'geoIndicationRegion',
        'additionalCertificates',
        'featureBadges',
        'geoBadgeSelections',
        'sku',
        'weight',
        'dimensionWidth',
        'dimensionHeight',
        'dimensionDepth',
        'productionSeasons',
        'salesMonths',
        'images',
      ],
    },
    otherSurfaces: [
      {
        id: 'buy-now-surface',
        type: 'SURFACE_SLOT',
        surface: 'BUY_NOW',
        enabled: true,
        order: 1,
        audiences: ['BUYER'],
        title: { tr: 'Hemen Al Sayfasi', en: 'Buy Now Surface' },
        subtitle: { tr: 'Liste ustu mesaji', en: 'Top of list message' },
        cta: {
          label: { tr: 'Listeyi Ac', en: 'Open List' },
          route: '/buy-now',
        },
      },
    ],
    preview: {
      defaultAudience: 'BUYER',
      defaultLocale: 'tr',
    },
  };
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockAdminApi(page: Page) {
  let currentDocument = {
    draft: createDraft(),
    publishedAt: null as null | string,
    updatedByAdminId: 'admin-seed',
    publishedByAdminId: null as null | string,
  };

  await page.route('http://localhost:3030/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === '/admin/auth/login') {
      return fulfillJson(route, { code: 'ADMIN_LOGIN_SUCCESS', message: 'login ok', admin, accessToken: 'test-token' });
    }

    if (path === '/admin/auth/me') {
      return fulfillJson(route, { code: 'SUCCESS', message: 'me', admin });
    }

    if (path === '/admin/mobile-config/draft' && request.method() === 'GET') {
      return fulfillJson(route, {
        code: 'MOBILE_CONFIG_DRAFT_FETCHED',
        message: 'draft ok',
        document: currentDocument,
      });
    }

    if (path === '/admin/mobile-config/draft' && request.method() === 'PATCH') {
      const payload = request.postDataJSON() as {
        draft: ReturnType<typeof createDraft>;
        reason: string;
      };

      currentDocument = {
        ...currentDocument,
        draft: payload.draft,
        updatedByAdminId: admin.id,
      };

      return fulfillJson(route, {
        code: 'MOBILE_CONFIG_DRAFT_UPDATED',
        message: payload.reason,
        document: currentDocument,
      });
    }

    if (path === '/admin/mobile-config/publish' && request.method() === 'POST') {
      currentDocument = {
        ...currentDocument,
        publishedAt: new Date('2026-05-04T12:30:00.000Z').toISOString(),
        publishedByAdminId: admin.id,
        updatedByAdminId: admin.id,
      };

      return fulfillJson(route, {
        code: 'MOBILE_CONFIG_PUBLISHED',
        message: 'published',
        document: currentDocument,
      });
    }

    return fulfillJson(route, {
      code: 'SUCCESS',
      message: 'ok',
      items: [],
      pagination: { page: 1, limit: 25, total: 0 },
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockAdminApi(page);
});

test('mobile config screen supports draft editing, preview and publish flow', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-posta').fill('admin@endemigo.test');
  await page.getByLabel('Şifre').fill('Secret123!');
  await page.getByRole('button', { name: 'Giriş yap' }).click();

  await page.goto('/mobile-config');
  const navigatorPanel = page.locator('.navigator-panel');
  const previewPanel = page.locator('.preview-panel');
  const drawerPanel = page.locator('.drawer-panel');

  await expect(page.getByRole('heading', { name: 'Mobil Uygulama' })).toBeVisible();
  await expect(page.getByText('Mobile Navigator')).toBeVisible();
  await expect(page.getByText('Home Preview')).toBeVisible();
  await expect(navigatorPanel.getByRole('button', { name: /Hemen Al Firsatlari/i })).toBeVisible();
  await expect(previewPanel.getByText('Hemen Al Firsatlari')).toBeVisible();

  await page.getByLabel('Dil').selectOption('en');
  await expect(previewPanel.getByText('Buy Now Deals')).toBeVisible();
  await page.getByLabel('Dil').selectOption('tr');

  await navigatorPanel.getByRole('button', { name: /Hemen Al Firsatlari/i }).click();
  await expect(drawerPanel.getByText('Icerik')).toBeVisible();
  await expect(drawerPanel.getByText('Gorunurluk')).toBeVisible();
  await expect(drawerPanel.getByText('Siralama')).toBeVisible();

  await drawerPanel.getByLabel('Baslik TR').fill('Yeni Hero Basligi');
  await expect(previewPanel.getByText('Yeni Hero Basligi')).toBeVisible();

  await drawerPanel.getByRole('button', { name: 'Gorunurluk' }).click();
  await drawerPanel.locator('.checkbox-pill input[type="checkbox"]').first().uncheck();
  await expect(previewPanel.getByText('Yeni Hero Basligi')).toHaveCount(0);
  await drawerPanel.locator('.checkbox-pill input[type="checkbox"]').first().check();
  await expect(previewPanel.getByText('Yeni Hero Basligi')).toBeVisible();

  await page.getByRole('button', { name: 'Taslagi Kaydet' }).click();
  await page.getByLabel('Gerekçe').fill('Metinleri admin tarafindan guncelliyorum');
  await page.getByRole('dialog', { name: 'Taslagi Kaydet' }).getByRole('button', { name: 'Kaydet', exact: true }).click();

  await expect(previewPanel.getByText('Yeni Hero Basligi')).toBeVisible();

  await page.getByRole('button', { name: 'Yayinla' }).click();
  await page.getByLabel('Gerekçe').fill('Mobil ana sayfa ayarlari yayina aliniyor');
  await page.getByRole('dialog', { name: 'Yayinla' }).getByRole('button', { name: 'Yayinla', exact: true }).click();

  await expect(page.getByText('admin-1')).toBeVisible();
  await expect(page.getByText('4.05.2026')).toBeVisible();
});
