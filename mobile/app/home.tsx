import { Product, Blog } from '@/types';
import {
  getDefaultMobileExperienceConfig,
  MOBILE_HOME_SURFACE_SLOT_IDS,
  MobileSurfaceKey,
  type MobileHomeSurfaceSlotId,
} from '@endemigo/shared';
import React from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, TextInput, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useMobileConfig } from '../hooks/useMobileConfig';
import { useProducts, useCategories, useDiscountedProducts, useMostLikedProducts, useBlogs } from '../hooks/useProducts';
import { Colors, Spacing } from '../constants/theme';
import { SectionHeader, BannerCarousel, EditorialBannerRow, ProductCard, HorizontalProductGrid, BlogCard, HomeQuickTabBar } from '../components/ui';
import { storage } from '../lib/storage';
import { useAuthStore } from '../store/authStore';
import { useRoleModeStore } from '../store/roleModeStore';
import { styles } from '../styles/tabs/index.styles';
import {
  isAudienceVisible,
  resolveLocalizedText,
  resolveMobileAudience,
  sortBlocksByOrder,
} from '../utils/mobileConfig';
import { getProductImageUri } from '../utils/productImages';
import { formatCurrency } from '../utils/transactionFormatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  elektronik: { icon: 'desktop-outline', color: Colors.primary },
  antika_koleksiyon: { icon: 'library-outline', color: Colors.secondary },
  sanat: { icon: 'color-palette-outline', color: Colors.accent },
  hali_kilim: { icon: 'grid-outline', color: Colors.tertiaryContainer },
  mucevher_saat: { icon: 'diamond-outline', color: Colors.accent },
  mobilya_dekor: { icon: 'bed-outline', color: Colors.surfaceTint },
  kiyafet_aksesuar: { icon: 'shirt-outline', color: Colors.tertiary },
  spor_outdoor: { icon: 'bicycle-outline', color: Colors.auctionGreen },
  yoresel_urunler: { icon: 'leaf-outline', color: Colors.primary },
  gida: { icon: 'restaurant-outline', color: Colors.primary },
  zeytinyagi: { icon: 'leaf-outline', color: Colors.secondary },
  taki: { icon: 'diamond-outline', color: Colors.accent },
  giyim: { icon: 'shirt-outline', color: Colors.tertiaryContainer },
  aricilik: { icon: 'flower-outline', color: Colors.accent },
  mobilya: { icon: 'bed-outline', color: Colors.surfaceTint },
  bahce: { icon: 'rose-outline', color: Colors.auctionGreen },
  default: { icon: 'ellipsis-horizontal', color: Colors.slate500 },
};
function getCategoryIcon(slug: string) {
  const k = slug?.toLowerCase().replace(/[- ]/g, '_');
  return CATEGORY_ICONS[k] || CATEGORY_ICONS.default;
}
const SQUARE_CARD = 148;
const RECENT_MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80',
  'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=80',
  'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&q=80',
  'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=600&q=80',
] as const;
const CATEGORY_MOCK_IMAGES: Record<string, string[]> = {
  gida: [
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=700&q=80',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&q=80',
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=700&q=80',
  ],
  zeytinyagi: [
    'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=700&q=80',
    'https://images.unsplash.com/photo-1615485925873-9b770dd53330?w=700&q=80',
    'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=700&q=80',
  ],
  taki: [
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=700&q=80',
    'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=700&q=80',
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=700&q=80',
  ],
  giyim: [
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=700&q=80',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700&q=80',
    'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=700&q=80',
  ],
  mobilya: [
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&q=80',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=700&q=80',
    'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=700&q=80',
  ],
  bahce: [
    'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=700&q=80',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=700&q=80',
    'https://images.unsplash.com/photo-1463320726281-696a485928c7?w=700&q=80',
  ],
};
const LISTING_BANNER_ROWS = [
  [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&q=80',
    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&q=80',
    'https://images.unsplash.com/photo-1506617564039-2f3b650b7010?w=900&q=80',
    'https://images.unsplash.com/photo-1471943311424-646960669fbc?w=900&q=80',
    'https://images.unsplash.com/photo-1447175008436-170170753d52?w=900&q=80',
  ],
  [
    'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=900&q=80',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=900&q=80',
    'https://images.unsplash.com/photo-1514996937319-344454492b37?w=900&q=80',
    'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?w=900&q=80',
    'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=900&q=80',
  ],
] as const;
const TRUST_POINT_KEYS = [
  'home.trustPointGuarantee',
  'home.trustPointCertification',
  'home.trustPointSecureShopping',
  'home.trustPointAuthentic',
  'home.trustPointBlockchain',
  'home.trustPointEconomy',
] as const;
const DISCOUNT_MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=700&q=80',
  'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=700&q=80',
  'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=700&q=80',
  'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=700&q=80',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=700&q=80',
  'https://images.unsplash.com/photo-1514996937319-344454492b37?w=700&q=80',
] as const;
const HERO_BACKGROUNDS = [Colors.primary, Colors.primaryContainer, Colors.secondary] as const;
const GEO_BADGE_LOGOS = {
  PDO: require('../assets/images/geo-indications/pdo.png'),
  PGI: require('../assets/images/geo-indications/pgi.png'),
  TSG: require('../assets/images/geo-indications/tsg.png'),
} as const;
const TILE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; route: string }> = {
  'home-tile-buy-now': { icon: 'bag-handle', color: Colors.primary, route: '/buy-now' },
  'home-tile-auction': { icon: 'hammer', color: Colors.auctionGreen, route: '/(tabs)/auctions' },
};
// Banner slides — sourced from mock service contract (campaigns endpoint).
// When backend is ready, replace with useCampaigns() hook.
const createFallbackHeroBanners = (t: (key: string) => string) => [
  {
    id: 'b1',
    badge: t('home.fallbackBanner1Badge'),
    title: t('home.fallbackBanner1Title'),
    subtitle: t('home.fallbackBanner1Subtitle'),
    bg: Colors.primary,
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
  },
  {
    id: 'b2',
    badge: t('home.fallbackBanner2Badge'),
    title: t('home.fallbackBanner2Title'),
    subtitle: t('home.fallbackBanner2Subtitle'),
    bg: Colors.auctionGreen,
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
  },
  {
    id: 'b3',
    badge: t('home.fallbackBanner3Badge'),
    title: t('home.fallbackBanner3Title'),
    subtitle: t('home.fallbackBanner3Subtitle'),
    bg: Colors.accent,
    image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=800&q=80',
  },
];

// Row 2 — Kampanyalar (backend: campaigns?type=promo)
const createFallbackPromoBanners = (t: (key: string) => string) => [
  {
    id: 'ed-3',
    label: t('home.fallbackPromoLabel'),
    title: t('home.fallbackPromo1Title'),
    subtitle: t('home.fallbackPromo1Subtitle'),
    cta: t('home.buyNow'),
    bg: Colors.tertiaryContainer,
    accent: Colors.auctionGreen,
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80',
  },
  {
    id: 'ed-4',
    label: t('home.fallbackPromoLabel'),
    title: t('home.fallbackPromo2Title'),
    subtitle: t('home.fallbackPromo2Subtitle'),
    cta: t('home.buyNow'),
    bg: Colors.secondaryContainer,
    accent: Colors.accent,
    image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800&q=80',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { data: mobileConfigData } = useMobileConfig();
  const { data, isLoading, refetch, isRefetching } = useProducts(1);
  const { data: categories } = useCategories();
  const { data: discountedProducts } = useDiscountedProducts();
  const { data: mostLikedProducts } = useMostLikedProducts();
  const { data: blogs } = useBlogs();
  const user = useAuthStore((state) => state.user);
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryImageErrors, setCategoryImageErrors] = React.useState<Record<string, boolean>>({});
  const mobileConfig = mobileConfigData ?? getDefaultMobileExperienceConfig();
  const mobileLocale = i18n.language.startsWith('en') ? 'en' : 'tr';
  const audience = resolveMobileAudience(user, activeMode);
  const allProducts = React.useMemo(() => data?.items ?? [], [data?.items]);
  const recentProducts = allProducts.slice(0, 3);
  const listingProducts = allProducts.length > 3 ? allProducts.slice(3, 7) : allProducts.slice(0, 4);
  const listingSlots = Array.from({ length: 4 }, (_, index) => listingProducts[index] || null);
  const discountedSlots = Array.from({ length: 6 }, (_, index) => {
    const existing = discountedProducts?.[index];
    if (existing) return existing;
    const mockImage = DISCOUNT_MOCK_IMAGES[index % DISCOUNT_MOCK_IMAGES.length];
    return {
      id: `mock-discount-${index}`,
      categoryId: 'discount',
      categoryName: t('home.discountedProducts'),
      title: t('home.mockListingTitle'),
      sellerName: t('home.brandName'),
      price: 0,
      imageUrl: mockImage,
      thumbnail: mockImage,
      images: [{ id: `mock-discount-${index}-image`, url: mockImage, sortOrder: 0, isPrimary: true }],
    } as Product;
  });

  React.useEffect(() => {
    const launchImages = [
      ...allProducts.map((product) => getProductImageUri(product, '')),
      ...(discountedProducts ?? []).map((product) => getProductImageUri(product, '')),
      ...(mostLikedProducts ?? []).map((product) => getProductImageUri(product, '')),
    ].filter((value) => value.length > 0);

    if (!launchImages.length) {
      return;
    }

    storage.setLaunchSplashImages(launchImages).catch(() => {});
  }, [allProducts, discountedProducts, mostLikedProducts]);

  const heroBanners = React.useMemo(() => {
    const visible = sortBlocksByOrder(
      mobileConfig.home.heroBanners.filter(
        (item) => item.enabled && isAudienceVisible(item.audiences, audience),
      ),
    );

    if (!visible.length) {
      return createFallbackHeroBanners(t);
    }

    return visible.map((banner, index) => ({
      id: banner.id,
      badge: resolveLocalizedText(banner.badge, mobileLocale, ''),
      title: resolveLocalizedText(banner.title, mobileLocale, ''),
      subtitle: resolveLocalizedText(banner.subtitle, mobileLocale, ''),
      bg: HERO_BACKGROUNDS[index % HERO_BACKGROUNDS.length],
      image: banner.imageUrl,
    }));
  }, [audience, mobileConfig, mobileLocale, t]);

  const heroBannerRoutes = React.useMemo(
    () =>
      Object.fromEntries(
        mobileConfig.home.heroBanners.map((banner) => [banner.id, banner.cta?.route ?? '/(tabs)/categories']),
      ),
    [mobileConfig.home.heroBanners],
  );

  const entryTiles = React.useMemo(() => {
    const visible = sortBlocksByOrder(
      mobileConfig.home.entryTiles.filter(
        (item) => item.enabled && isAudienceVisible(item.audiences, audience),
      ),
    );

    return visible.length ? visible : mobileConfig.home.entryTiles;
  }, [audience, mobileConfig.home.entryTiles]);

  const homeSectionMap = React.useMemo(
    () => new Map(mobileConfig.home.sections.map((section) => [section.id, section])),
    [mobileConfig.home.sections],
  );

  const promoBanners = React.useMemo(() => {
    const visible = sortBlocksByOrder(
      mobileConfig.home.promoBanners.filter(
        (item) => item.enabled && isAudienceVisible(item.audiences, audience),
      ),
    );

    if (!visible.length) {
      return createFallbackPromoBanners(t);
    }

    return visible.map((banner, index) => ({
      id: banner.id,
      label: resolveLocalizedText(banner.label, mobileLocale, t('home.buyNow')),
      title: resolveLocalizedText(banner.title, mobileLocale, ''),
      subtitle: resolveLocalizedText(banner.subtitle, mobileLocale, ''),
      cta: resolveLocalizedText(banner.cta?.label, mobileLocale, t('home.explore')),
      bg: index % 2 === 0 ? Colors.tertiaryContainer : Colors.secondaryContainer,
      accent: index % 2 === 0 ? Colors.auctionGreen : Colors.accent,
      image: banner.imageUrl,
    }));
  }, [audience, mobileConfig.home.promoBanners, mobileLocale, t]);

  const promoRoutes = React.useMemo(
    () =>
      Object.fromEntries(
        mobileConfig.home.promoBanners.map((banner) => [banner.id, banner.cta?.route ?? '/buy-now']),
      ),
    [mobileConfig.home.promoBanners],
  );

  const trustBlock = React.useMemo(
    () =>
      sortBlocksByOrder(
        mobileConfig.home.trustBlocks.filter(
          (item) => item.enabled && isAudienceVisible(item.audiences, audience),
        ),
      )[0] ?? null,
    [audience, mobileConfig.home.trustBlocks],
  );

  const recentlyViewedSection = homeSectionMap.get('recently-viewed');
  const listingsSection = homeSectionMap.get('listings');
  const categoriesSection = homeSectionMap.get('categories');
  const discountedSection = homeSectionMap.get('discounted-products');
  const mostLikedSection = homeSectionMap.get('most-liked-products');
  const campaignsSection = homeSectionMap.get('campaigns');
  const blogSection = homeSectionMap.get('blog');
  const trustSection = homeSectionMap.get('trust-hub');

  const homeSurfaceSlots = React.useMemo(
    () =>
      sortBlocksByOrder(
        mobileConfig.otherSurfaces.filter((slot) => slot.surface === MobileSurfaceKey.HOME),
      ),
    [mobileConfig.otherSurfaces],
  );

  const homeSurfaceSlotMap = React.useMemo(
    () => new Map(homeSurfaceSlots.map((slot) => [slot.id, slot])),
    [homeSurfaceSlots],
  );

  const orderedHomeModules = React.useMemo(() => {
    const configuredModuleIds = homeSurfaceSlots
      .map((slot) => slot.id)
      .filter((id): id is MobileHomeSurfaceSlotId =>
        (MOBILE_HOME_SURFACE_SLOT_IDS as readonly string[]).includes(id),
      );
    const missingDefaultModuleIds = MOBILE_HOME_SURFACE_SLOT_IDS.filter(
      (id) => !configuredModuleIds.includes(id),
    );
    return [...configuredModuleIds, ...missingDefaultModuleIds];
  }, [homeSurfaceSlots]);

  function isHomeModuleVisible(moduleId: MobileHomeSurfaceSlotId): boolean {
    const slot = homeSurfaceSlotMap.get(moduleId);
    if (!slot) {
      return true;
    }
    return slot.enabled && isAudienceVisible(slot.audiences, audience);
  }

  function renderHomeModule(moduleId: MobileHomeSurfaceSlotId): React.ReactNode {
    if (!isHomeModuleVisible(moduleId)) {
      return null;
    }

    switch (moduleId) {
      case 'home-search-bar':
        return (
          <View key={moduleId} style={styles.searchSection}>
            <View style={styles.searchRow}>
              <View style={styles.searchBar}>
                {!searchQuery ? (
                  <View pointerEvents="none" style={styles.searchLogoOverlay}>
                    <Image
                      source={require('../assets/images/endemigo-logo.png')}
                      style={styles.searchLogoPlaceholder}
                      resizeMode="contain"
                    />
                  </View>
                ) : null}
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <View style={styles.searchActions}>
                <TouchableOpacity
                  style={[styles.searchActionButton, styles.profileActionButton]}
                  activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)/profile')}
                  accessibilityRole="button"
                  accessibilityLabel={t('tabs.profile')}
                >
                  <Ionicons name="person-circle-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.searchActionButton, styles.notificationActionButton]}
                  activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)/notifications')}
                  accessibilityRole="button"
                  accessibilityLabel={t('tabs.notifications')}
                >
                  <Ionicons name="notifications-outline" size={19} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      case 'home-hero-banners':
        return (
          <BannerCarousel
            key={moduleId}
            slides={heroBanners}
            onSlidePress={(slide) => router.push((heroBannerRoutes[slide.id] ?? '/(tabs)/categories') as never)}
          />
        );
      case 'home-entry-tiles':
        return (
          <View key={moduleId} style={styles.tilesSection}>
            {entryTiles.map((tile) => {
              const meta = TILE_META[tile.id] ?? {
                icon: 'bag-handle' as const,
                color: Colors.primary,
                route: tile.cta.route,
              };
              const isAuctionTile = meta.icon === 'hammer';

              return (
                <TouchableOpacity
                  key={tile.id}
                  style={[styles.tile, isAuctionTile ? styles.auctionTile : styles.shopTile]}
                  activeOpacity={0.8}
                  onPress={() => router.push((tile.cta.route || meta.route) as never)}
                >
                  <View style={[styles.tileIcon, { backgroundColor: meta.color }]}>
                    <Ionicons name={meta.icon} size={28} color={Colors.white} />
                  </View>
                  <Text style={styles.tileTitle}>
                    {resolveLocalizedText(tile.title, mobileLocale, t('home.buyNow'))}
                  </Text>
                  <Text style={styles.tileSubtitle}>
                    {resolveLocalizedText(tile.subtitle, mobileLocale, t('home.buyNowSub'))}
                  </Text>
                  <TouchableOpacity
                    style={[styles.tileButton, isAuctionTile ? styles.tileButtonAuction : null]}
                    activeOpacity={0.8}
                    onPress={() => router.push((tile.cta.route || meta.route) as never)}
                  >
                    <Text style={styles.tileButtonText}>
                      {resolveLocalizedText(tile.cta.label, mobileLocale, t('home.explore'))}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      case 'home-listings':
        return listingsSection?.enabled ? (
          <React.Fragment key={moduleId}>
            <SectionHeader title={resolveLocalizedText(listingsSection.title, mobileLocale, t('home.listings'))} />
            <View style={styles.listingGrid}>
              {listingSlots.map((item, index) => {
                const imageUri = getProductImageUri(item, RECENT_MOCK_IMAGES[(index + 1) % RECENT_MOCK_IMAGES.length]);
                const hasGeoIndication = Boolean(item?.geoIndicationCertNo || item?.geoIndicationRegion);
                const resolvedGeoTypes = item?.geoIndicationTypes?.length
                  ? item.geoIndicationTypes
                  : item?.geoIndicationType
                    ? [item.geoIndicationType]
                    : [];
                const geoBadgeLogos = resolvedGeoTypes
                  .map((type) => GEO_BADGE_LOGOS[type])
                  .filter(Boolean)
                  .slice(0, 3);
                return (
                  <TouchableOpacity
                    key={item?.id || `mock-listing-${index}`}
                    style={styles.listingCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (item?.id) {
                        router.push(`/product/${item.id}`);
                        return;
                      }
                      router.push('/(tabs)/categories');
                    }}
                  >
                    <View style={styles.listingImageContainer}>
                      <Image source={{ uri: imageUri }} style={styles.listingImage} resizeMode="cover" />
                      {hasGeoIndication ? (
                        geoBadgeLogos.length > 0 ? (
                          <View style={styles.listingGeoBadgeLogosRow}>
                            {geoBadgeLogos.map((logo, badgeIndex) => (
                              <Image
                                key={`listing-geo-${item?.id || index}-${badgeIndex}`}
                                source={logo}
                                style={styles.listingGeoBadgeLogo}
                                resizeMode="contain"
                              />
                            ))}
                          </View>
                        ) : (
                          <View style={styles.listingGeoBadge}>
                            <Ionicons name="ribbon" size={10} color={Colors.white} />
                            <Text style={styles.listingGeoBadgeText}>{t('product.geoIndicationBadge')}</Text>
                          </View>
                        )
                      ) : null}
                    </View>
                    <View style={styles.listingBody}>
                      <Text style={styles.listingTitle} numberOfLines={2}>
                        {item?.title || t('home.mockListingTitle')}
                      </Text>
                      <Text style={styles.listingPrice}>
                        {item ? formatCurrency(item.price) : t('home.mockListingPrice')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.listingSeeAllButton}
              activeOpacity={0.85}
              onPress={() => router.push((listingsSection.route || '/(tabs)/categories') as never)}
            >
              <Text style={styles.listingSeeAllText}>
                {resolveLocalizedText(listingsSection.seeAllLabel, mobileLocale, t('home.seeAll'))}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.white} />
            </TouchableOpacity>
            {LISTING_BANNER_ROWS.map((row, rowIndex) => (
              <ScrollView
                key={`listing-banner-row-${rowIndex}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listingBannerRow}
              >
                {row.map((imageUri, bannerIndex) => (
                  <TouchableOpacity
                    key={`${rowIndex}-${bannerIndex}`}
                    style={styles.listingBannerCard}
                    activeOpacity={0.9}
                  >
                    <Image source={{ uri: imageUri }} style={styles.listingBannerImage} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ))}
          </React.Fragment>
        ) : null;
      case 'home-categories':
        return categoriesSection?.enabled ? (
          <React.Fragment key={moduleId}>
            <SectionHeader
              title={resolveLocalizedText(categoriesSection.title, mobileLocale, t('tabs.categories'))}
              seeAllLabel={resolveLocalizedText(categoriesSection.seeAllLabel, mobileLocale, t('home.seeAll'))}
              onSeeAll={() => router.push((categoriesSection.route || '/(tabs)/categories') as never)}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {(categories || []).map((cat) => {
                const { icon, color } = getCategoryIcon(cat.slug);
                const hasImage = Boolean(cat.imageUrl) && !categoryImageErrors[cat.id];
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryItem}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/categories/[id]',
                        params: { id: cat.id, name: cat.name, slug: cat.slug },
                      })
                    }
                  >
                    {hasImage ? (
                      <Image
                        source={{ uri: cat.imageUrl ?? undefined }}
                        style={styles.categoryImage}
                        resizeMode="cover"
                        onError={() => setCategoryImageErrors((prev) => ({ ...prev, [cat.id]: true }))}
                      />
                    ) : (
                      <View style={styles.categoryIcon}>
                        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={24} color={color} />
                      </View>
                    )}
                    <Text style={styles.categoryName}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {(categories || []).map((cat) => {
              const catProducts = (data?.items || []).filter(
                (p: Product) => p.categoryId === cat.id || p.categoryName === cat.name,
              );
              if (!catProducts.length) return null;
              const slugKey = cat.slug?.toLowerCase().replace(/[- ]/g, '_');
              const categoryImages = CATEGORY_MOCK_IMAGES[slugKey] || RECENT_MOCK_IMAGES;
              const categorySlots = Array.from({ length: Math.max(3, catProducts.length) }, (_, index) => {
                const existing = catProducts[index];
                if (existing) return existing;
                const mockImage = categoryImages[index % categoryImages.length];
                return {
                  id: `mock-${cat.id}-${index}`,
                  categoryId: cat.id,
                  categoryName: cat.name,
                  title: `${cat.name} ${t('home.mockListingTitle')}`,
                  sellerName: t('home.brandName'),
                  price: 0,
                  imageUrl: mockImage,
                  thumbnail: mockImage,
                  images: [{ id: `mock-${cat.id}-${index}-image`, url: mockImage, sortOrder: 0, isPrimary: true }],
                } as Product;
              });
              return (
                <View key={cat.id}>
                  <SectionHeader
                    title={cat.name}
                    accentColor={getCategoryIcon(cat.slug).color}
                    seeAllLabel={resolveLocalizedText(categoriesSection.seeAllLabel, mobileLocale, t('home.seeAll'))}
                    onSeeAll={() => router.push((categoriesSection.route || '/(tabs)/categories') as never)}
                    style={styles.sectionMargin}
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.squareProductScroll}
                    decelerationRate="fast"
                    snapToInterval={SQUARE_CARD + Spacing.md}
                    snapToAlignment="start"
                  >
                    {categorySlots.map((item: Product) => (
                      <ProductCard
                        key={item.id}
                        item={item}
                        variant="square"
                        onPress={() => {
                          if (!item.id.startsWith('mock-')) router.push(`/product/${item.id}`);
                        }}
                      />
                    ))}
                  </ScrollView>
                </View>
              );
            })}
          </React.Fragment>
        ) : null;
      case 'home-recently-viewed':
        return recentlyViewedSection?.enabled ? (
          <React.Fragment key={moduleId}>
            <SectionHeader title={resolveLocalizedText(recentlyViewedSection.title, mobileLocale, t('home.recentlyViewed'))} />
            <View style={styles.recentGrid}>
              {recentProducts.map((item: Product, index) => {
                const imageUri = getProductImageUri(item, RECENT_MOCK_IMAGES[index % RECENT_MOCK_IMAGES.length]);
                const hasGeoIndication = Boolean(item.geoIndicationCertNo || item.geoIndicationRegion);
                const resolvedGeoTypes = item.geoIndicationTypes?.length
                  ? item.geoIndicationTypes
                  : item.geoIndicationType
                    ? [item.geoIndicationType]
                    : [];
                const geoBadgeLogos = resolvedGeoTypes
                  .map((type) => GEO_BADGE_LOGOS[type])
                  .filter(Boolean)
                  .slice(0, 3);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.recentCard}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/product/${item.id}`)}
                  >
                    <View style={styles.recentImageContainer}>
                      <Image source={{ uri: imageUri }} style={styles.recentImage} resizeMode="cover" />
                      {hasGeoIndication ? (
                        geoBadgeLogos.length > 0 ? (
                          <View style={styles.recentGeoBadgeLogosRow}>
                            {geoBadgeLogos.map((logo, badgeIndex) => (
                              <Image
                                key={`recent-geo-${item.id}-${badgeIndex}`}
                                source={logo}
                                style={styles.recentGeoBadgeLogo}
                                resizeMode="contain"
                              />
                            ))}
                          </View>
                        ) : (
                          <View style={styles.recentGeoBadge}>
                            <Ionicons name="ribbon" size={10} color={Colors.white} />
                            <Text style={styles.recentGeoBadgeText}>{t('product.geoIndicationBadge')}</Text>
                          </View>
                        )
                      ) : null}
                    </View>
                    <View style={styles.recentBody}>
                      <Text style={styles.recentTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.recentPrice}>{formatCurrency(item.price)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </React.Fragment>
        ) : null;
      case 'home-discounted-products':
        return discountedSection?.enabled && discountedSlots.length > 0 ? (
          <View key={moduleId}>
            <SectionHeader
              title={resolveLocalizedText(discountedSection.title, mobileLocale, t('home.discountedProducts'))}
              accentColor={Colors.error}
              style={styles.sectionMargin}
            />
            <HorizontalProductGrid
              data={discountedSlots}
              rows={2}
              onPress={(item) => {
                if (!item.id.startsWith('mock-discount-')) router.push(`/product/${item.id}`);
              }}
            />
            <TouchableOpacity
              style={styles.discountedSeeAllButton}
              activeOpacity={0.85}
              onPress={() => router.push((discountedSection.route || '/(tabs)/categories') as never)}
            >
              <Text style={styles.discountedSeeAllText}>
                {resolveLocalizedText(discountedSection.seeAllLabel, mobileLocale, t('home.seeAll'))}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
        ) : null;
      case 'home-most-liked-products':
        return mostLikedSection?.enabled && mostLikedProducts && mostLikedProducts.length > 0 ? (
          <View key={moduleId}>
            <SectionHeader
              title={resolveLocalizedText(mostLikedSection.title, mobileLocale, t('home.mostLikedProducts'))}
              accentColor={Colors.secondary}
              style={styles.sectionMargin}
            />
            <HorizontalProductGrid
              data={mostLikedProducts}
              rows={1}
              onPress={(item) => router.push(`/product/${item.id}`)}
            />
            <TouchableOpacity
              style={styles.discountedSeeAllButton}
              activeOpacity={0.85}
              onPress={() => router.push((mostLikedSection.route || '/(tabs)/categories') as never)}
            >
              <Text style={styles.discountedSeeAllText}>
                {resolveLocalizedText(mostLikedSection.seeAllLabel, mobileLocale, t('home.seeAll'))}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
        ) : null;
      case 'home-trust-bar':
        return (
          <View key={moduleId} style={styles.trustBar}>
            <View style={styles.trustItem}>
              <View style={[styles.trustIcon, { backgroundColor: `${Colors.secondary}1A` }]}>
                <Ionicons name="flash" size={18} color={Colors.secondary} />
              </View>
              <View>
                <Text style={styles.trustTitle}>{t('home.trustFast')}</Text>
                <Text style={styles.trustSubtitle}>{t('home.trustFastSub')}</Text>
              </View>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <View style={[styles.trustIcon, { backgroundColor: `${Colors.primary}1A` }]}>
                <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.trustTitle}>{t('home.trustOriginal')}</Text>
                <Text style={styles.trustSubtitle}>{t('home.trustOriginalSub')}</Text>
              </View>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <View style={[styles.trustIcon, { backgroundColor: `${Colors.accent}1A` }]}>
                <Ionicons name="heart" size={18} color={Colors.accent} />
              </View>
              <View>
                <Text style={styles.trustTitle}>{t('home.trustFair')}</Text>
                <Text style={styles.trustSubtitle}>{t('home.trustFairSub')}</Text>
              </View>
            </View>
          </View>
        );
      case 'home-campaigns':
        return campaignsSection?.enabled ? (
          <React.Fragment key={moduleId}>
            <SectionHeader
              title={resolveLocalizedText(campaignsSection.title, mobileLocale, t('home.currentCampaigns'))}
              accentColor={Colors.accent}
              seeAllLabel={resolveLocalizedText(campaignsSection.seeAllLabel, mobileLocale, t('home.seeAll'))}
              style={styles.sectionMarginExtra}
            />
            <EditorialBannerRow
              banners={promoBanners}
              onPress={(banner) => router.push((promoRoutes[banner.id] ?? '/buy-now') as never)}
            />
          </React.Fragment>
        ) : null;
      case 'home-blog':
        return blogSection?.enabled && blogs && blogs.length > 0 ? (
          <View key={moduleId} style={styles.sectionMargin}>
            <SectionHeader
              title={resolveLocalizedText(blogSection.title, mobileLocale, t('home.blog'))}
              accentColor={Colors.primary}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.blogScroll}
              decelerationRate="fast"
              snapToInterval={SCREEN_WIDTH * 0.7 + Spacing.md}
              snapToAlignment="start"
            >
              {blogs.map((blog: Blog) => (
                <BlogCard
                  key={blog.id}
                  item={blog}
                  onPress={() => router.push(`/blog/${blog.slug || blog.id}` as never)}
                />
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.seeAllBlogsBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/explore?section=blogs' as never)}
            >
              <Text style={styles.seeAllBlogsText}>
                {resolveLocalizedText(blogSection.seeAllLabel, mobileLocale, t('home.seeAll'))}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ) : null;
      case 'home-trust-hub':
        return trustSection?.enabled && trustBlock ? (
          <React.Fragment key={moduleId}>
            <View style={styles.sectionMargin}>
              <View style={styles.trustHubCard}>
                <Text style={styles.trustHubTitle}>
                  {resolveLocalizedText(trustBlock.title, mobileLocale, t('home.trustHubTitle'))}
                </Text>
                <Text style={styles.trustHubSubtitle}>
                  {resolveLocalizedText(trustBlock.subtitle, mobileLocale, t('home.authenticHeadline'))}
                </Text>
                <View style={styles.trustChipWrap}>
                  {TRUST_POINT_KEYS.slice(0, 4).map((key) => (
                    <View key={key} style={styles.trustChip}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.secondary} />
                      <Text style={styles.trustChipText}>{t(key)}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.notifyButton}
                  activeOpacity={0.85}
                  onPress={() => router.push((trustBlock.cta?.route || '/(tabs)/notifications') as never)}
                >
                  <Ionicons name="notifications-outline" size={18} color={Colors.white} />
                  <Text style={styles.notifyButtonText}>
                    {resolveLocalizedText(trustBlock.cta?.label, mobileLocale, t('home.notifyMe'))}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trustBannerRow}
            >
              {LISTING_BANNER_ROWS[0].slice(0, 3).map((imageUri, idx) => (
                <TouchableOpacity key={`trust-banner-${idx}`} style={styles.trustBannerCard} activeOpacity={0.9}>
                  <Image source={{ uri: imageUri }} style={styles.trustBannerImage} resizeMode="cover" />
                  <View style={styles.trustBannerOverlay}>
                    <Text style={styles.trustBannerText}>{idx === 0 ? t('home.trends') : t('home.fixedBanner')}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </React.Fragment>
        ) : null;
      case 'home-quick-tab-bar':
        return null;
      default:
        return null;
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {orderedHomeModules.map((moduleId) => renderHomeModule(moduleId))}

        {/* Bottom spacing for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      {isHomeModuleVisible('home-quick-tab-bar') ? (
        <HomeQuickTabBar activeTab="home" />
      ) : null}
    </SafeAreaView>
  );
}
