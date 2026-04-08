import { Product, Blog, Category } from '@/types';
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
import { useProducts, useCategories, useDiscountedProducts, useMostLikedProducts, useBlogs } from '../../hooks/useProducts';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { SectionHeader, BannerCarousel, EditorialBannerRow, ProductCard, HorizontalProductGrid, BlogCard } from '../../components/ui';
import { styles } from './index.styles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - Spacing.base * 2 - Spacing.base) / 2;

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
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
  const { data: blogs } = useBlogs();

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
                  <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={24} color={color} />
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
            {data.items.map((item: Product) => (
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
          style={styles.sectionMarginLarge}
        />
        <EditorialBannerRow banners={EDITORIAL_ROW_1} />

        {/* ─── Kampanyalar ─── */}
        <SectionHeader
          title="Güncel Kampanyalar"
          accentColor={Colors.accent}
          seeAllLabel={t('home.seeAll')}
          style={styles.sectionMarginExtra}
        />
        <EditorialBannerRow banners={EDITORIAL_ROW_2} />

        {/* ─── İndirimdeki Ürünler (2x2 Horizontal Grid) ─── */}
        {discountedProducts && discountedProducts.length > 0 && (
          <View>
            <SectionHeader
              title={t('home.discountedProducts')}
              accentColor={Colors.error}
              seeAllLabel={t('home.seeAll')}
              style={styles.sectionMargin}
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
              title={t('home.mostLikedProducts')}
              accentColor={Colors.secondary}
              seeAllLabel={t('home.seeAll')}
              style={styles.sectionMargin}
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
            (p: Product) => p.categoryId === cat.id || p.categoryName === cat.name
          );
          if (!catProducts.length) return null;
          return (
            <View key={cat.id}>
              <SectionHeader
                title={cat.name}
                accentColor={getCategoryIcon(cat.slug).color}
                seeAllLabel={t('home.seeAll')}
                onSeeAll={() => router.push('/(tabs)/categories')}
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
                {catProducts.map((item: Product) => (
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

        {/* ─── Blog Bölümü ─── */}
        {blogs && blogs.length > 0 && (
          <View style={styles.sectionMargin}>
            <SectionHeader
              title={t('home.blog')}
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
                  onPress={() => console.log('Blog pressed', blog.id)}
                />
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.seeAllBlogsBtn} activeOpacity={0.8}>
              <Text style={styles.seeAllBlogsText}>{t('home.seeAll')}</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom spacing for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}
