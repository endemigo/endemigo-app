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
  titleEn: string;
  body: string;
  bodyEn: string;
  excerpt: string;
  excerptEn: string;
  slug: string;
  imageUrl: string;
  status: ContentStudioItemStatus;
  order: number;
  tags: string[];
  updatedAt: string;
  readTime: string;
  readTimeEn: string;
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
  titleEn: string;
  excerpt: string;
  excerptEn: string;
  readTime: string;
  readTimeEn: string;
  image: string;
  slug: string;
  body: string;
  bodyEn: string;
  publishedAt: string;
}

function createCollectionItem(
  item: Partial<ContentStudioItem> & Pick<ContentStudioItem, 'id' | 'title'>,
): ContentStudioItem {
  return {
    id: item.id,
    title: item.title,
    titleEn: item.titleEn ?? '',
    body: item.body ?? '',
    bodyEn: item.bodyEn ?? '',
    excerpt: item.excerpt ?? '',
    excerptEn: item.excerptEn ?? '',
    slug: item.slug ?? item.id,
    imageUrl: item.imageUrl ?? '',
    status: item.status ?? 'PUBLISHED',
    order: item.order ?? 1,
    tags: item.tags ?? [],
    updatedAt: item.updatedAt ?? '2026-05-15T00:00:00.000Z',
    readTime: item.readTime ?? '',
    readTimeEn: item.readTimeEn ?? '',
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
          titleEn: 'About Endemigo',
          body: 'Endemigo, yerel ureticileri guvenli ticaret akislariyla bulusturan bir pazar yeridir.',
          bodyEn: 'Endemigo is a marketplace that connects local producers with secure trade flows.',
          excerpt: 'Marka anlatimi ve temel tanitim metni.',
          excerptEn: 'Brand story and basic introduction text.',
          slug: 'about-endemigo',
        }),
      ],
      news: [
        createCollectionItem({
          id: 'news-community-update',
          title: 'Topluluk Guncellemesi',
          titleEn: 'Community Update',
          body: 'Bu hafta yeni satici onboarding akisi ve kampanya alanlari yayina alindi.',
          bodyEn: 'This week, new seller onboarding flow and campaign areas were launched.',
          excerpt: 'Haftalik topluluk duyurusu.',
          excerptEn: 'Weekly community announcement.',
          slug: 'community-update',
        }),
      ],
      blogs: [
        createCollectionItem({
          id: 'blog-siirt-fistigi',
          title: 'Anadolu’nun Kayip Lezzetleri: Siirt Fistiginin Sirri',
          titleEn: 'Lost Flavors of Anatolia: The Secret of Siirt Pistachio',
          body: 'Geleneksel tarim yontemleriyle hasat edilen Siirt fistiginin lezzet katmanlarini ve saklama tüyolarini bu yazida topladik.',
          bodyEn: 'We collected the flavor profiles and storage tips of Siirt pistachio harvested with traditional farming methods in this article.',
          excerpt: 'Geleneksel tarim yontemleriyle hasat edilen gercek Siirt fistigini nasil anlarsiniz?',
          excerptEn: 'How to recognize authentic Siirt pistachio harvested with traditional methods?',
          slug: 'siirt-fistiginin-sirri',
          imageUrl: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800&q=80',
          readTime: '4 dk okuma',
          readTimeEn: '4 min read',
        }),
        createCollectionItem({
          id: 'blog-kilim-motifleri',
          title: 'El Dokumasi Kilimlerde Motiflerin Dili',
          titleEn: 'The Language of Motifs in Handwoven Rugs',
          body: 'Her renk ve geometrik sekil bir hikaye tasir. Bu rehberde en yaygin motifleri ve anlamlarini bir araya getirdik.',
          bodyEn: 'Every color and geometric shape carries a story. In this guide, we gathered the most common motifs and their meanings.',
          excerpt: 'Anadolu kilimlerindeki her bir geometrik seklin anlami burada.',
          excerptEn: 'The meaning of each geometric shape in Anatolian rugs is here.',
          slug: 'kilim-motiflerinin-dili',
          imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
          readTime: '6 dk okuma',
          readTimeEn: '6 min read',
        }),
      ],
      faq: [
        createCollectionItem({
          id: 'faq-secure-shopping',
          title: 'Guvenli Alisveris Nasil Calisir?',
          titleEn: 'How Secure Shopping Works?',
          body: 'Escrow, onay ve teslimat akislari siparisinizi korumak icin birlikte calisir.',
          bodyEn: 'Escrow, approval, and delivery flows work together to protect your order.',
          excerpt: 'Guvenli alisveris akisinin ozeti.',
          excerptEn: 'Summary of the secure shopping flow.',
          slug: 'guvenli-alisveris',
        }),
      ],
      discover: [
        createCollectionItem({
          id: 'discover-geo-route',
          title: 'Cografi Isaretli Urun Rotasi',
          titleEn: 'Geographically Indicated Products Route',
          body: 'Cografi isaretli urunleri hikayeleriyle birlikte one cikaran editor secimi.',
          bodyEn: 'Editor choice highlighting geographically indicated products along with their stories.',
          excerpt: 'Editor secimi cografi isaret rotasi.',
          excerptEn: 'Editor choice geographical indication route.',
          slug: 'geo-route',
        }),
      ],
      menuManagement: [
        createCollectionItem({
          id: 'menu-home-primary',
          title: 'Ana Navigasyon',
          titleEn: 'Primary Navigation',
          body: 'Ana gezinme akisi: Ana Sayfa, Kesfet, Favoriler, Hemen Al, Muzayedeler.',
          bodyEn: 'Main navigation flow: Home, Explore, Favorites, Buy Now, Auctions.',
          excerpt: 'Primary navigation menu definition.',
          excerptEn: 'Primary navigation menu definition.',
          slug: 'home-primary',
        }),
      ],
      banners: [
        createCollectionItem({
          id: 'banner-seasonal-home',
          title: 'Sezonluk Hero Banner',
          titleEn: 'Seasonal Hero Banner',
          body: 'Yerel ureticilerin sezonluk secileri icin hero banner copy.',
          bodyEn: 'Hero banner copy for local producers seasonal selections.',
          excerpt: 'Hero banner copy and image pair.',
          excerptEn: 'Hero banner copy and image pair.',
          slug: 'seasonal-home',
        }),
      ],
      popups: [
        createCollectionItem({
          id: 'popup-first-order',
          title: 'Ilk Siparis Popup',
          titleEn: 'First Order Popup',
          body: 'Ilk siparisini veren kullanicilara odul hatirlatmasi.',
          bodyEn: 'Reward reminder for users placing their first order.',
          excerpt: 'First order popup copy.',
          excerptEn: 'First order popup copy.',
          slug: 'first-order',
        }),
      ],
      polls: [
        createCollectionItem({
          id: 'poll-campaign-interest',
          title: 'Kampanya Ilgi Anketi',
          titleEn: 'Campaign Interest Poll',
          body: 'Kullanicilarin hangi kampanya tiplerine ilgi gosterdigini olcen mini anket.',
          bodyEn: 'Mini poll measuring users interest in campaign types.',
          excerpt: 'Campaign interest poll.',
          excerptEn: 'Campaign interest poll.',
          slug: 'campaign-interest',
        }),
      ],
      newsletters: [
        createCollectionItem({
          id: 'newsletter-weekly-highlights',
          title: 'Haftalik Kesif Ozetleri',
          titleEn: 'Weekly Discovery Highlights',
          body: 'Haftanin one cikan urunleri, muzayedeleri ve blog hikayelerini tek e-postada toplar.',
          bodyEn: 'Gathers featured products, auctions, and blog stories of the week in a single email.',
          excerpt: 'Weekly editorial newsletter.',
          excerptEn: 'Weekly editorial newsletter.',
          slug: 'weekly-highlights',
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
    typeof candidate.titleEn === 'string' &&
    typeof candidate.body === 'string' &&
    typeof candidate.bodyEn === 'string' &&
    typeof candidate.excerpt === 'string' &&
    typeof candidate.excerptEn === 'string' &&
    typeof candidate.slug === 'string' &&
    typeof candidate.imageUrl === 'string' &&
    typeof candidate.status === 'string' &&
    typeof candidate.order === 'number' &&
    Array.isArray(candidate.tags) &&
    typeof candidate.updatedAt === 'string' &&
    typeof candidate.readTime === 'string' &&
    typeof candidate.readTimeEn === 'string'
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
