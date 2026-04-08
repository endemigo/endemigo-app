import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useProducts, useCategories, useDiscountedProducts, useMostLikedProducts } from '../../hooks/useProducts';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { SectionHeader, BannerCarousel, EditorialBannerRow, ProductCard, HorizontalProductGrid } from '../../components/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - Spacing.base * 2 - Spacing.base) / 2;

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  gida: { icon: 'restaurant-outline', color: Colors.primary },
  zeytinyagi: { icon: 'leaf-outline', color: Colors.secondary },
  taki: { icon: 'diamond-outline', color: Colors.accent },
  giyim: { icon: 'shirt-outline', color: '#9333EA' },
  aricilik: { icon: 'flower-outline', color: '#F59E0B' },
  mobilya: { icon: 'bed-outline', color: '#3B82F6' },
  bahce: { icon: 'rose-outline', color: '#16A34A' },
  default: { icon: 'ellipsis-horizontal', color: Colors.slate500 },
};
function getCategoryIcon(slug: string) {
  const k = slug?.toLowerCase().replace(/[- ]/g, '_');
  return CATEGORY_ICONS[k] || CATEGORY_ICONS.default;
}

const BANNER_WIDTH = SCREEN_WIDTH - Spacing.base * 2;
const SQUARE_CARD = 148;

// Banner slides — sourced from mock service contract (campaigns endpoint).
// When backend is ready, replace with useCampaigns() hook.
const BANNERS = [
  {
    id: 'b1',
    badge: 'YENİ KOLEKSİYON',
    title: 'Anadolu\'nun\nBereketli Topraklarından',
    subtitle: 'Coğrafi işaretli ürünler kapınıza gelsin',
    bg: Colors.primary,
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
  },
  {
    id: 'b2',
    badge: 'MÜZAYEDELİ SATIŞ',
    title: 'Canlı Müzayedeler\nBaşladı!',
    subtitle: 'Nadir parçalar için şimdi teklif ver',
    bg: Colors.auctionGreen,
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
  },
  {
    id: 'b3',
    badge: 'FIRSATLAR',
    title: 'El Yapımı\nÜrünler',
    subtitle: 'Ustasından doğrudan, hakiki lezzetler',
    bg: Colors.accent,
    image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=800&q=80',
  },
];

// Row 1 — Editörün Seçimi (backend: campaigns?type=editorial)
const EDITORIAL_ROW_1 = [
  {
    id: 'ed-1',
    label: 'Editörün Seçimi',
    title: 'Bu Haftanın\nEn Çok Satanı',
    subtitle: 'Zeytinlik bahçelerden, sofranıza',
    cta: 'Keşfet',
    bg: '#0F4C81',
    accent: Colors.accent,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80',
  },
  {
    id: 'ed-2',
    label: 'Editörün Seçimi',
    title: 'El Yapımı\nBakir Ürünler',
    subtitle: 'Anadolu ustasından, hakiki işçilik',
    cta: 'Keşfet',
    bg: '#1E3A5F',
    accent: Colors.primary,
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800&q=80',
  },
];

// Row 2 — Kampanyalar (backend: campaigns?type=promo)
const EDITORIAL_ROW_2 = [
  {
    id: 'ed-3',
    label: 'Kampanya',
    title: 'Karakovan Balı\'nda\n%20 İndirim',
    subtitle: 'Sınırlı stok, kaçırma!',
    cta: 'Hemen Al',
    bg: '#7C3F00',
    accent: Colors.auctionGreen,
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80',
  },
  {
    id: 'ed-4',
    label: 'Kampanya',
    title: 'Siirt Fıstığı\'nda\n%15 İndirim',
    subtitle: 'Haftaya kadar geçerli, perşembeye kadar!',
    cta: 'Hemen Al',
    bg: '#1A4731',
    accent: Colors.accent,
    image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800&q=80',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, refetch, isRefetching } = useProducts(1);
  const { data: categories } = useCategories();
  const { data: discountedProducts } = useDiscountedProducts();
  const { data: mostLikedProducts } = useMostLikedProducts();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        {/* ─── Top Header ─── */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <Ionicons name="menu" size={24} color={Colors.primary} />
            <Image
              source={require('../../assets/images/endemigo-logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity>
              <Ionicons name="search" size={22} color={Colors.slate400} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationBadge}>
              <Ionicons name="notifications" size={20} color={Colors.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Search Bar ─── */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.primary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('home.searchPlaceholder')}
              placeholderTextColor={Colors.slate400}
              editable={false}
            />
            <TouchableOpacity style={styles.qrButton}>
              <Ionicons name="qr-code-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Banner Carousel ─── */}
        <BannerCarousel slides={BANNERS} />

        {/* ─── Shopping vs Auction Tiles ─── */}
        <View style={styles.tilesSection}>
          <TouchableOpacity style={[styles.tile, styles.shopTile]} activeOpacity={0.8}>
            <View style={[styles.tileIcon, { backgroundColor: Colors.accent }]}>
              <Ionicons name="bag-handle" size={28} color={Colors.white} />
            </View>
            <Text style={[styles.tileTitle, { color: Colors.accent }]}>{t('home.buyNow')}</Text>
            <Text style={[styles.tileSubtitle, { color: `${Colors.accent}99` }]}>
              {t('home.buyNowSub')}
            </Text>
            <TouchableOpacity
              style={[styles.tileButton, { backgroundColor: Colors.accent }]}
              activeOpacity={0.8}
            >
              <Text style={styles.tileButtonText}>{t('home.explore')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tile, styles.auctionTile]}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/auctions')}
          >
            <View style={[styles.tileIcon, { backgroundColor: Colors.auctionGreen }]}>
              <Ionicons name="hammer" size={28} color={Colors.white} />
            </View>
            <Text style={[styles.tileTitle, { color: Colors.auctionGreen }]}>{t('home.auction')}</Text>
            <Text style={[styles.tileSubtitle, { color: `${Colors.auctionGreen}99` }]}>
              {t('home.auctionSub')}
            </Text>
            <TouchableOpacity
              style={[styles.tileButton, { backgroundColor: Colors.auctionGreen }]}
              activeOpacity={0.8}
            >
              <Text style={styles.tileButtonText}>{t('home.explore')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* ─── Categories ─── */}
        <SectionHeader
          title={t('tabs.categories')}
          seeAllLabel={t('home.seeAll')}
          onSeeAll={() => router.push('/(tabs)/categories')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {(categories || []).map((cat) => {
            const { icon, color } = getCategoryIcon(cat.slug);
            return (
              <TouchableOpacity key={cat.id} style={styles.categoryItem} activeOpacity={0.7}>
                <View style={styles.categoryIcon}>
                  <Ionicons name={icon as any} size={24} color={color} />
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Recently viewed — shown only when backend returns last viewed items */}
        {/* Removed mock RECENT_ITEMS — will be wired from user session endpoint */}

        {/* ─── Trust Bar ─── */}
        <View style={styles.trustBar}>
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

        {/* ─── Product Grid ─── */}
        <SectionHeader title={t('home.topProducts')} />

        {(!data?.items?.length) ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={Colors.slate300} />
            <Text style={styles.emptyText}>{t('home.noProducts')}</Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {data.items.map((item: any) => (
              <ProductCard
                key={item.id}
                item={item}
                onPress={() => router.push(`/product/${item.id}`)}
              />
            ))}
          </View>
        )}

        {/* ─── Editörün Seçimi ─── */}
        <SectionHeader
          title="Editörün Seçimi"
          seeAllLabel={t('home.seeAll')}
          style={{ marginTop: Spacing.xxl }}
        />
        <EditorialBannerRow banners={EDITORIAL_ROW_1} />

        {/* ─── Kampanyalar ─── */}
        <SectionHeader
          title="Güncel Kampanyalar"
          accentColor={Colors.accent}
          seeAllLabel={t('home.seeAll')}
          style={{ marginTop: Spacing.xxl + Spacing.md }}
        />
        <EditorialBannerRow banners={EDITORIAL_ROW_2} />

        {/* ─── İndirimdeki Ürünler (2x2 Horizontal Grid) ─── */}
        {discountedProducts && discountedProducts.length > 0 && (
          <View>
            <SectionHeader
              title="İndirimdeki Ürünler"
              accentColor={Colors.error}
              seeAllLabel={t('home.seeAll')}
              style={{ marginTop: Spacing.xl }}
            />
            <HorizontalProductGrid
              data={discountedProducts}
              rows={2}
              onPress={(item) => router.push(`/product/${item.id}`)}
            />
          </View>
        )}

        {/* ─── En Çok Beğenilenler (2x2 Horizontal Grid) ─── */}
        {mostLikedProducts && mostLikedProducts.length > 0 && (
          <View>
            <SectionHeader
              title="En Çok Beğenilenler"
              accentColor={Colors.secondary}
              seeAllLabel={t('home.seeAll')}
              style={{ marginTop: Spacing.xl }}
            />
            <HorizontalProductGrid
              data={mostLikedProducts}
              rows={2}
              onPress={(item) => router.push(`/product/${item.id}`)}
            />
          </View>
        )}

        {/* ─── Kategori bazlı ürün satırları ─── */}
        {(categories || []).map((cat) => {
          const catProducts = (data?.items || []).filter(
            (p: any) => p.categoryId === cat.id || p.categoryName === cat.name
          );
          if (!catProducts.length) return null;
          return (
            <View key={cat.id}>
              <SectionHeader
                title={cat.name}
                accentColor={getCategoryIcon(cat.slug).color}
                seeAllLabel={t('home.seeAll')}
                onSeeAll={() => router.push('/(tabs)/categories')}
                style={{ marginTop: Spacing.xl }}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.squareProductScroll}
                decelerationRate="fast"
                snapToInterval={SQUARE_CARD + Spacing.md}
                snapToAlignment="start"
              >
                {catProducts.map((item: any) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    variant="square"
                    onPress={() => router.push(`/product/${item.id}`)}
                  />
                ))}
              </ScrollView>
            </View>
          );
        })}

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.md,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodyMedium,
  },

  // ─── Top Header ───
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    ...Shadows.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  brandLogo: {
    height: 28,
    width: 130,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  notificationBadge: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Search Bar ───
  searchSection: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    height: 56,
    paddingHorizontal: Spacing.base,
    ...Shadows.md,
  },
  searchIcon: {
    marginRight: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.onSurface,
  },
  qrButton: {
    backgroundColor: `${Colors.primary}1A`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },

  // ─── Banner ───
  bannerSection: {
    marginBottom: Spacing.xl,
    paddingLeft: Spacing.base,
  },
  banner: {
    width: BANNER_WIDTH,
    height: 192,
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
    backgroundColor: Colors.primary,
    ...Shadows.lg,
  },
  bannerBgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.slate300,
  },
  dotActive: {
    width: 18,
    backgroundColor: Colors.primary,
  },
  bannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  bannerBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  bannerBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bannerTitle: {
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    fontSize: FontSize.titleLg,
    color: Colors.white,
    lineHeight: 30,
    marginBottom: Spacing.sm,
  },
  bannerSubtitle: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyMedium,
    color: 'rgba(255,255,255,0.8)',
    maxWidth: 220,
  },

  // ─── Tiles ───
  tilesSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
    marginBottom: Spacing.xl,
  },
  tile: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius['4xl'],
    alignItems: 'center',
    borderWidth: 2,
  },
  shopTile: {
    backgroundColor: `${Colors.accent}1A`,
    borderColor: `${Colors.accent}1A`,
  },
  auctionTile: {
    backgroundColor: `${Colors.auctionGreen}1A`,
    borderColor: `${Colors.auctionGreen}1A`,
  },
  tileIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  tileTitle: {
    fontFamily: FontFamily.headline,
    fontWeight: '700',
    fontSize: FontSize.bodyXl,
    marginBottom: Spacing.xs,
  },
  tileSubtitle: {
    fontSize: 10,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: Spacing.base,
  },
  tileButton: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  tileButtonText: {
    color: Colors.white,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },

  // ─── Section Header ───
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    fontSize: FontSize.subheading,
    color: Colors.onSurface,
  },
  seeAll: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    color: Colors.primary,
  },

  // ─── Categories ───
  categoriesScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  categoryItem: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  categoryName: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurface,
    textAlign: 'center',
  },

  // ─── Son Ziyaret Edilenler ───
  recentGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  recentCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  recentImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.surfaceContainerLow,
  },
  recentBody: {
    padding: Spacing.sm,
  },
  recentTitle: {
    fontSize: 9,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.onSurface,
    lineHeight: 12,
    marginBottom: 4,
    height: 24,
  },
  recentPrice: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.headlineBlack,
    color: Colors.primary,
  },

  // ─── Trust Bar ───
  trustBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
    alignItems: 'center',
  },
  trustItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trustIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustTitle: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  trustSubtitle: {
    fontSize: 9,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },
  trustDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.slate100,
    marginHorizontal: Spacing.sm,
  },

  // ─── Product Grid ───
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
  },
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  productImageContainer: {
    aspectRatio: 1,
    width: '100%',
  },
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceContainerLow,
  },
  productBody: {
    padding: Spacing.md,
    flex: 1,
  },
  productTitle: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
    lineHeight: 16,
  },
  productCategory: {
    fontSize: 10,
    fontFamily: FontFamily.body,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.sm,
  },
  productFooter: {
    marginTop: 'auto',
  },
  productPrice: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    color: Colors.primary,
  },

  // ─── Empty State ───
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyText: {
    color: Colors.onSurface,
    fontSize: FontSize.titleSm,
    fontFamily: FontFamily.headline,
    fontWeight: '700',
    marginTop: Spacing.base,
  },
  emptySubtext: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    marginTop: Spacing.sm,
  },

  // ─── Editorial Banners ───
  editorialScroll: {
    paddingLeft: Spacing.base,
    paddingRight: Spacing.base,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  editorialCard: {
    width: SCREEN_WIDTH * 0.8,
    height: 180,
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
    ...Shadows.md,
  },
  editorialBgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  editorialContent: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  editorialLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xs,
  },
  editorialLabelText: {
    color: Colors.white,
    fontSize: 9,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  editorialTitle: {
    color: Colors.white,
    fontSize: FontSize.titleSm,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    lineHeight: 26,
  },
  editorialSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
  },
  editorialCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  editorialCtaText: {
    color: Colors.white,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Section title row with accent bar
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionAccentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },

  // Divider between sections
  editorialDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginVertical: Spacing.xl,
    gap: Spacing.md,
  },
  editorialDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.slate200,
  },
  editorialDividerText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // ─── Square Category Product Cards ───
  squareProductScroll: {
    paddingLeft: Spacing.base,
    paddingRight: Spacing.base,
    gap: Spacing.md,
  },
  squareCard: {
    width: SQUARE_CARD,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  squareCardImage: {
    width: SQUARE_CARD,
    height: SQUARE_CARD,
    backgroundColor: Colors.surfaceContainerLow,
  },
  squareCardBody: {
    padding: Spacing.sm,
  },
  squareCardTitle: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.onSurface,
    lineHeight: 16,
    marginBottom: 2,
  },
  squareCardPrice: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    color: Colors.primary,
  },
});
