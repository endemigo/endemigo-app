export const CONTENT_STUDIO_COLLECTION_KEYS = [
  'contents',
  'news',
  'blogs',
  'faq',
  'discover',
  'menuManagement',
  'banners',
  'popups',
  'polls',
  'newsletters',
] as const;

export const CONTENT_STUDIO_ITEM_STATUSES = [
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
] as const;

export type ContentStudioCollectionKey =
  (typeof CONTENT_STUDIO_COLLECTION_KEYS)[number];

export type ContentStudioItemStatus =
  (typeof CONTENT_STUDIO_ITEM_STATUSES)[number];

export type ContentStudioMetadataValue =
  | string
  | number
  | boolean
  | null
  | ContentStudioMetadataValue[]
  | { [key: string]: ContentStudioMetadataValue };

export interface ContentStudioItem {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  excerpt: string;
  slug: string;
  imageUrl: string;
  status: ContentStudioItemStatus;
  order: number;
  category: string;
  tags: string[];
  route: string;
  updatedAt: string;
  metadata: Record<string, ContentStudioMetadataValue>;
}

export interface ContentStudioCollections {
  contents: ContentStudioItem[];
  news: ContentStudioItem[];
  blogs: ContentStudioItem[];
  faq: ContentStudioItem[];
  discover: ContentStudioItem[];
  menuManagement: ContentStudioItem[];
  banners: ContentStudioItem[];
  popups: ContentStudioItem[];
  polls: ContentStudioItem[];
  newsletters: ContentStudioItem[];
}

export interface ContentStudioDocument {
  version: number;
  collections: ContentStudioCollections;
}

export interface PublicBlogItem {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  readTime: string;
  image: string;
  slug: string;
  body: string;
  publishedAt: string;
}

function createCollectionItem(
  item: Partial<ContentStudioItem> & Pick<ContentStudioItem, 'id' | 'title'>,
): ContentStudioItem {
  return {
    id: item.id,
    title: item.title,
    subtitle: item.subtitle ?? '',
    body: item.body ?? '',
    excerpt: item.excerpt ?? '',
    slug: item.slug ?? item.id,
    imageUrl: item.imageUrl ?? '',
    status: item.status ?? 'PUBLISHED',
    order: item.order ?? 1,
    category: item.category ?? '',
    tags: item.tags ?? [],
    route: item.route ?? '',
    updatedAt: item.updatedAt ?? '2026-05-15T00:00:00.000Z',
    metadata: item.metadata ?? {},
  };
}

export function getDefaultContentStudioDocument(): ContentStudioDocument {
  return {
    version: 1,
    collections: {
      contents: [
        createCollectionItem({
          id: 'content-about-endemigo',
          title: 'Endemigo Hakkinda',
          subtitle: 'Marka anlatimi',
          body: 'Endemigo, yerel ureticileri guvenli ticaret akislariyla bulusturan bir pazar yeridir.',
          excerpt: 'Marka anlatimi ve temel tanitim metni.',
          slug: 'about-endemigo',
          category: 'Landing',
          route: '/about',
        }),
      ],
      news: [
        createCollectionItem({
          id: 'news-community-update',
          title: 'Topluluk Guncellemesi',
          subtitle: 'Haftalik operasyon bulteni',
          body: 'Bu hafta yeni satici onboarding akisi ve kampanya alanlari yayina alindi.',
          excerpt: 'Haftalik topluluk duyurusu.',
          slug: 'community-update',
          category: 'Announcement',
          route: '/news/community-update',
        }),
      ],
      blogs: [
        createCollectionItem({
          id: 'blog-siirt-fistigi',
          title: 'Anadolu’nun Kayip Lezzetleri: Siirt Fistiginin Sirri',
          subtitle: 'Ureticiden sofraya',
          body: 'Geleneksel tarim yontemleriyle hasat edilen Siirt fistiginin lezzet katmanlarini ve saklama tüyolarini bu yazida topladik.',
          excerpt: 'Geleneksel tarim yontemleriyle hasat edilen gercek Siirt fistigini nasil anlarsiniz?',
          slug: 'siirt-fistiginin-sirri',
          imageUrl: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800&q=80',
          category: 'Lezzet Sirlari',
          route: '/blog/siirt-fistiginin-sirri',
          metadata: { readTime: '4 dk okuma' },
        }),
        createCollectionItem({
          id: 'blog-kilim-motifleri',
          title: 'El Dokumasi Kilimlerde Motiflerin Dili',
          subtitle: 'Anadolu motif rehberi',
          body: 'Her renk ve geometrik sekil bir hikaye tasir. Bu rehberde en yaygin motifleri ve anlamlarini bir araya getirdik.',
          excerpt: 'Anadolu kilimlerindeki her bir geometrik seklin anlami burada.',
          slug: 'kilim-motiflerinin-dili',
          imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
          category: 'El Sanatlari',
          route: '/blog/kilim-motiflerinin-dili',
          metadata: { readTime: '6 dk okuma' },
        }),
      ],
      faq: [
        createCollectionItem({
          id: 'faq-secure-shopping',
          title: 'Guvenli Alisveris Nasil Calisir?',
          subtitle: 'Sik sorulan sorular',
          body: 'Escrow, onay ve teslimat akislari siparisinizi korumak icin birlikte calisir.',
          excerpt: 'Guvenli alisveris akisinin ozeti.',
          slug: 'guvenli-alisveris',
          category: 'Security',
          route: '/faq/guvenli-alisveris',
        }),
      ],
      discover: [
        createCollectionItem({
          id: 'discover-geo-route',
          title: 'Cografi Isaretli Urun Rotasi',
          subtitle: 'Kesif koleksiyonu',
          body: 'Cografi isaretli urunleri hikayeleriyle birlikte one cikaran editor secimi.',
          excerpt: 'Editor secimi cografi isaret rotasi.',
          slug: 'geo-route',
          category: 'Discovery',
          route: '/discover/geo-route',
        }),
      ],
      menuManagement: [
        createCollectionItem({
          id: 'menu-home-primary',
          title: 'Ana Navigasyon',
          subtitle: 'Header menusu',
          body: 'Ana gezinme akisi: Ana Sayfa, Kesfet, Favoriler, Hemen Al, Muzayedeler.',
          excerpt: 'Primary navigation menu definition.',
          slug: 'home-primary',
          category: 'Navigation',
          route: '/menu/home-primary',
        }),
      ],
      banners: [
        createCollectionItem({
          id: 'banner-seasonal-home',
          title: 'Sezonluk Hero Banner',
          subtitle: 'Ana sayfa ust alani',
          body: 'Yerel ureticilerin sezonluk secileri icin hero banner copy.',
          excerpt: 'Hero banner copy and image pair.',
          imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
          slug: 'seasonal-home',
          category: 'Homepage Hero',
          route: '/banner/seasonal-home',
        }),
      ],
      popups: [
        createCollectionItem({
          id: 'popup-first-order',
          title: 'Ilk Siparis Popup',
          subtitle: 'Donusum popup',
          body: 'Ilk siparisini veren kullanicilara odul hatirlatmasi.',
          excerpt: 'First order popup copy.',
          slug: 'first-order',
          category: 'Growth',
          route: '/popup/first-order',
        }),
      ],
      polls: [
        createCollectionItem({
          id: 'poll-campaign-interest',
          title: 'Kampanya Ilgi Anketi',
          subtitle: 'Onboarding soru seti',
          body: 'Kullanicilarin hangi kampanya tiplerine ilgi gosterdigini olcen mini anket.',
          excerpt: 'Campaign interest poll.',
          slug: 'campaign-interest',
          category: 'Survey',
          route: '/poll/campaign-interest',
        }),
      ],
      newsletters: [
        createCollectionItem({
          id: 'newsletter-weekly-highlights',
          title: 'Haftalik Kesif Ozetleri',
          subtitle: 'E-bulten akisi',
          body: 'Haftanin one cikan urunleri, muzayedeleri ve blog hikayelerini tek e-postada toplar.',
          excerpt: 'Weekly editorial newsletter.',
          slug: 'weekly-highlights',
          category: 'Email',
          route: '/newsletter/weekly-highlights',
          metadata: {
            segment: 'buyers',
            subject: 'Haftanin one cikan secileri',
          },
        }),
      ],
    },
  };
}

function isContentStudioItem(value: unknown): value is ContentStudioItem {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.subtitle === 'string' &&
    typeof candidate.body === 'string' &&
    typeof candidate.excerpt === 'string' &&
    typeof candidate.slug === 'string' &&
    typeof candidate.imageUrl === 'string' &&
    typeof candidate.status === 'string' &&
    typeof candidate.order === 'number' &&
    typeof candidate.category === 'string' &&
    Array.isArray(candidate.tags) &&
    typeof candidate.route === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    candidate.metadata !== null &&
    typeof candidate.metadata === 'object'
  );
}

export function isContentStudioDocument(
  value: unknown,
): value is ContentStudioDocument {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.version !== 'number') return false;
  if (!candidate.collections || typeof candidate.collections !== 'object') {
    return false;
  }

  const collections = candidate.collections as Record<string, unknown>;
  return CONTENT_STUDIO_COLLECTION_KEYS.every((key) => {
    const items = collections[key];
    return Array.isArray(items) && items.every(isContentStudioItem);
  });
}
