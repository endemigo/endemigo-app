import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '../../constants/theme';
import { useAuctions } from '../../hooks/useAuctions';
import { useProducts, useCategories, useBlogs } from '../../hooks/useProducts';
import {
  useSearchAuctions,
  useSearchProducts,
  type SearchAuctionItem,
} from '../../hooks/useSearch';
import { BlogCard, ProductCard } from '../../components/ui';
import type { Blog, Category, Product } from '../../types';
import { formatCurrency } from '../../utils/transactionFormatters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../../styles/tabs/ExploreScreen.styles';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';

type ExploreSectionKey = 'all' | 'products' | 'auctions' | 'blogs';

const AUCTION_PLACEHOLDER =
  'https://placehold.co/120x120/F8F9FA/42b94b?text=Auction';

function getReserveBadgeConfig(
  reservePrice: number | null | undefined,
  reserveMet: boolean | null | undefined,
  t: (key: string) => string,
) {
  if (reservePrice === null || reservePrice === undefined) {
    return null;
  }

  return reserveMet
    ? {
        label: `${t('auctions.reserve')}: ${t('auction.reserveMet')}`,
        backgroundColor: Colors.secondaryContainer,
        textColor: Colors.onSecondaryContainer,
      }
    : {
        label: `${t('auctions.reserve')}: ${t('auction.reserveNotMet')}`,
        backgroundColor: Colors.errorContainer,
        textColor: Colors.onErrorContainer,
      };
}

function normalizeSection(value: string | string[] | undefined): ExploreSectionKey {
  if (value === 'products' || value === 'auctions' || value === 'blogs') {
    return value;
  }
  return 'all';
}

function getCategoryChipConfig(categoryName: string) {
  const normalized = categoryName.trim().toLocaleLowerCase('tr-TR');

  if (normalized.includes('elektronik') || normalized.includes('electronic')) {
    return { icon: 'hardware-chip-outline' as const, bg: '#E0F2FE', text: '#0369A1' };
  }
  if (
    normalized.includes('antika') ||
    normalized.includes('koleksiyon') ||
    normalized.includes('antique') ||
    normalized.includes('collectible')
  ) {
    return { icon: 'trophy-outline' as const, bg: '#FEF3C7', text: '#B45309' };
  }
  if (normalized.includes('sanat') || normalized.includes('art')) {
    return { icon: 'color-palette-outline' as const, bg: '#F3E8FF', text: '#7E22CE' };
  }
  if (normalized.includes('halı') || normalized.includes('kilim') || normalized.includes('rug') || normalized.includes('carpet')) {
    return { icon: 'grid-outline' as const, bg: '#E2F1E8', text: '#15803D' };
  }
  if (
    normalized.includes('mücevher') ||
    normalized.includes('saat') ||
    normalized.includes('jewelry') ||
    normalized.includes('watch')
  ) {
    return { icon: 'sparkles-outline' as const, bg: '#FCE7F3', text: '#BE185D' };
  }
  if (
    normalized.includes('mobilya') ||
    normalized.includes('dekor') ||
    normalized.includes('furniture') ||
    normalized.includes('decor')
  ) {
    return { icon: 'home-outline' as const, bg: '#E0E7FF', text: '#4338CA' };
  }

  return { icon: 'sparkles-outline' as const, bg: '#F3F4F5', text: '#3F4850' };
}

export default function ExploreScreen() {
  const { t } = useTranslation();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string }>();
  const [query, setQuery] = React.useState('');
  const [activeSection, setActiveSection] = React.useState<ExploreSectionKey>(
    normalizeSection(params.section),
  );
  const hasQuery = query.trim().length >= 2;

  const products = useProducts(1);
  const auctions = useAuctions(1);
  const categories = useCategories();
  const blogs = useBlogs();
  const searchProducts = useSearchProducts(
    { q: query.trim(), sort: 'popular', limit: 8 },
    hasQuery,
  );
  const searchAuctions = useSearchAuctions(
    { q: query.trim(), sort: 'ending_soon', limit: 6 },
    hasQuery,
  );

  const filteredBlogs = React.useMemo(() => {
    const items = blogs.data ?? [];
    if (!hasQuery) return items.slice(0, 5);
    const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');
    return items.filter((item) =>
      `${item.title} ${item.excerpt}`
        .toLocaleLowerCase('tr-TR')
        .includes(normalizedQuery),
    );
  }, [blogs.data, hasQuery, query]);

  const featuredCategories = React.useMemo(
    () => ((categories.data as Category[]) ?? []).slice(0, 6),
    [categories.data],
  );
  const freshProducts = React.useMemo(
    () => (products.data?.items ?? []).slice(0, 4),
    [products.data?.items],
  );
  const liveAuctions = React.useMemo(
    () => (auctions.data?.items ?? []).slice(0, 4),
    [auctions.data?.items],
  );

  const renderProductGrid = (items: Product[], emptyKey: string) => {
    if (items.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Ionicons name="cube-outline" size={28} color={Colors.slate400} />
          <Text style={styles.emptyTitle}>{t(emptyKey)}</Text>
        </View>
      );
    }

    return (
      <View style={styles.productGrid}>
        {items.map((item) => (
          <View key={item.id} style={styles.productGridCardWrap}>
            <ProductCard
              item={item}
              onPress={() => router.push(`/product/${item.id}`)}
            />
          </View>
        ))}
      </View>
    );
  };

  const renderProductCarousel = (items: Product[], emptyKey: string) => {
    if (items.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Ionicons name="cube-outline" size={28} color={Colors.slate400} />
          <Text style={styles.emptyTitle}>{t(emptyKey)}</Text>
        </View>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.carouselScroll}
        contentContainerStyle={styles.carouselScrollContent}
      >
        {items.map((item) => (
          <View key={item.id} style={styles.productCardWrap}>
            <ProductCard
              item={item}
              onPress={() => router.push(`/product/${item.id}`)}
            />
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderAuctionList = (items: SearchAuctionItem[], emptyKey: string) => {
    if (items.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Ionicons name="hammer-outline" size={28} color={Colors.slate400} />
          <Text style={styles.emptyTitle}>{t(emptyKey)}</Text>
        </View>
      );
    }

    return items.map((item) => {
      const reserveBadge = getReserveBadgeConfig(
        item.reservePrice,
        item.reserveMet,
        t,
      );

      return (
        <TouchableOpacity
          key={item.id}
          style={styles.auctionCard}
          activeOpacity={0.82}
          onPress={() => router.push(`/auction/${item.id}` as never)}
        >
          <Image
            source={{ uri: item.productImageUrl || AUCTION_PLACEHOLDER }}
            style={styles.auctionImage}
            contentFit="cover"
          />
          <View style={styles.auctionBody}>
            <View style={styles.auctionHeader}>
              <Text style={styles.auctionTitle} numberOfLines={2}>
                {item.productTitle}
              </Text>
              <Text style={styles.auctionMeta}>
                {item.categoryName || t('exploreScreen.openAuction')}
              </Text>
            </View>
            <View style={styles.auctionFooter}>
              <View style={styles.auctionPriceContainer}>
                <Text style={styles.auctionPriceLabel}>
                  {t('auction.currentPrice') || 'Fiyat'}:
                </Text>
                <Text style={styles.auctionPrice}>
                  {formatCurrency(item.currentPrice)}
                </Text>
                <Text style={styles.auctionMeta}>
                  {` • ${t('exploreScreen.bidCount', { count: item.bidCount })}`}
                </Text>
              </View>
              {reserveBadge ? (
                <View
                  style={[
                    styles.reserveBadge,
                    { backgroundColor: reserveBadge.backgroundColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.reserveBadgeText,
                      { color: reserveBadge.textColor },
                    ]}
                    numberOfLines={1}
                  >
                    {reserveBadge.label}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      );
    });
  };

  const renderBlogList = (items: Blog[], emptyKey: string) => {
    if (items.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Ionicons
            name="newspaper-outline"
            size={28}
            color={Colors.slate400}
          />
          <Text style={styles.emptyTitle}>{t(emptyKey)}</Text>
        </View>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.blogScroll}
      >
        {items.map((item) => (
          <BlogCard
            key={String(item.id)}
            item={item}
            onPress={() =>
              router.push(`/blog/${item.slug || String(item.id)}` as never)
            }
          />
        ))}
      </ScrollView>
    );
  };

  const renderSearchResults = () => (
    <>
      {(activeSection === 'all' || activeSection === 'products') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('exploreScreen.products')}</Text>
          {searchProducts.isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            renderProductGrid(
              searchProducts.data?.items ?? [],
              'exploreScreen.noProducts',
            )
          )}
        </View>
      )}

      {(activeSection === 'all' || activeSection === 'auctions') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('exploreScreen.auctions')}</Text>
          {searchAuctions.isLoading ? (
            <ActivityIndicator size="small" color={Colors.auctionGreen} />
          ) : (
            renderAuctionList(
              searchAuctions.data?.items ?? [],
              'exploreScreen.noAuctions',
            )
          )}
        </View>
      )}

      {(activeSection === 'all' || activeSection === 'blogs') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('exploreScreen.blogs')}</Text>
          {blogs.isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            renderBlogList(filteredBlogs, 'exploreScreen.noBlogs')
          )}
        </View>
      )}
    </>
  );

  const renderDiscoveryState = () => (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {t('exploreScreen.featuredCategories')}
          </Text>
          <TouchableOpacity
            style={styles.sectionAction}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/categories')}
          >
            <Text style={styles.sectionActionText}>
              {t('exploreScreen.seeAllCategories') || 'Tümü'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {featuredCategories.map((category: Category) => {
            const config = getCategoryChipConfig(category.name);
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryChip, { backgroundColor: config.bg }]}
                activeOpacity={0.82}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/categories/[id]',
                    params: { id: category.id, name: category.name },
                  })
                }
              >
                <Ionicons
                  name={config.icon}
                  size={15}
                  color={config.text}
                />
                <Text style={[styles.categoryChipText, { color: config.text }]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('exploreScreen.newArrivals')}</Text>
        </View>
        {products.isLoading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          renderProductCarousel(freshProducts, 'exploreScreen.noProducts')
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('exploreScreen.liveAuctions')}</Text>
        </View>
        {auctions.isLoading ? (
          <ActivityIndicator size="small" color={Colors.auctionGreen} />
        ) : (
          renderAuctionList(liveAuctions, 'exploreScreen.noAuctions')
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {t('exploreScreen.editorialStories')}
          </Text>
        </View>
        {blogs.isLoading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          renderBlogList(filteredBlogs, 'exploreScreen.noBlogs')
        )}
      </View>
    </>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top > 0 ? insets.top + Spacing.sm : Spacing.base },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.headerTopRow}>
          <Image
            source={require('../../assets/images/endemigo-logo.png')}
            style={styles.headerLogo}
            contentFit="contain"
          />
          <TouchableOpacity
            style={styles.headerNotificationButton}
            activeOpacity={0.7}
            onPress={() => {
              if (!isLoggedIn) {
                useModalStore.getState().showModal({
                  title: t('common.authRequiredTitle'),
                  message: t('notifications.authRequiredMessage'),
                  type: 'info',
                  confirmText: t('auth.login'),
                  cancelText: t('common.cancel'),
                  onConfirm: () => {
                    useModalStore.getState().hideModal();
                    router.push('/(auth)/login');
                  },
                  onCancel: () => {
                    useModalStore.getState().hideModal();
                  }
                });
                return;
              }
              router.push('/(tabs)/notifications');
            }}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={Colors.primary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('exploreScreen.searchPlaceholder')}
            placeholderTextColor={Colors.slate400}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <TouchableOpacity
              style={styles.searchClearButton}
              activeOpacity={0.7}
              onPress={() => setQuery('')}
            >
              <Ionicons name="close-circle" size={18} color={Colors.slate400} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterScrollContent}
      >
        {(['all', 'products', 'auctions', 'blogs'] as ExploreSectionKey[]).map(
          (section) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'grid-outline';
            if (section === 'products') iconName = 'cube-outline';
            if (section === 'auctions') iconName = 'hammer-outline';
            if (section === 'blogs') iconName = 'newspaper-outline';

            return (
              <TouchableOpacity
                key={section}
                style={[
                  styles.filterChip,
                  activeSection === section && styles.filterChipActive,
                ]}
                activeOpacity={0.84}
                onPress={() => setActiveSection(section)}
              >
                <Ionicons
                  name={iconName}
                  size={14}
                  color={
                    activeSection === section
                      ? Colors.primaryContainer
                      : Colors.onSurfaceVariant
                  }
                />
                <Text
                  style={[
                    styles.filterChipText,
                    activeSection === section && styles.filterChipTextActive,
                  ]}
                >
                  {t(`exploreScreen.${section}`)}
                </Text>
              </TouchableOpacity>
            );
          },
        )}
      </ScrollView>

      {hasQuery ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('exploreScreen.searchResults')}
          </Text>
          {renderSearchResults()}
        </View>
      ) : (
        <>
          <View style={styles.hintCard}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.hintText}>{t('exploreScreen.searchHint')}</Text>
          </View>
          {renderDiscoveryState()}
        </>
      )}
    </ScrollView>
  );
}
