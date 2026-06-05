import React from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
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
import { styles } from '../../styles/tabs/ExploreScreen.styles';

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

export default function ExploreScreen() {
  const { t } = useTranslation();
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
    () => (categories.data ?? []).slice(0, 6),
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
          <View key={item.id} style={styles.productCardWrap}>
            <ProductCard
              item={item}
              onPress={() => router.push(`/product/${item.id}`)}
            />
          </View>
        ))}
      </View>
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
          />
          <View style={styles.auctionBody}>
            <Text style={styles.auctionTitle} numberOfLines={2}>
              {item.productTitle}
            </Text>
            <Text style={styles.auctionMeta}>
              {item.categoryName || t('exploreScreen.openAuction')}
            </Text>
            <Text style={styles.auctionPrice}>
              {formatCurrency(item.currentPrice)}
            </Text>
            <View style={styles.auctionFooter}>
              <Text style={styles.auctionMeta}>
                {t('exploreScreen.bidCount', { count: item.bidCount })}
              </Text>
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
        <Text style={styles.sectionTitle}>
          {t('exploreScreen.featuredCategories')}
        </Text>
        <View style={styles.categoryRow}>
          {featuredCategories.map((category: Category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryChip}
              activeOpacity={0.82}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/categories/[id]',
                  params: { id: category.id, name: category.name },
                })
              }
            >
              <Ionicons
                name="sparkles-outline"
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.categoryChipText}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('exploreScreen.newArrivals')}</Text>
        {products.isLoading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          renderProductGrid(freshProducts, 'exploreScreen.noProducts')
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('exploreScreen.liveAuctions')}</Text>
        {auctions.isLoading ? (
          <ActivityIndicator size="small" color={Colors.auctionGreen} />
        ) : (
          renderAuctionList(liveAuctions, 'exploreScreen.noAuctions')
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('exploreScreen.editorialStories')}
        </Text>
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
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroBadge}>{t('exploreScreen.heroBadge')}</Text>
        <Text style={styles.heroTitle}>{t('exploreScreen.heroTitle')}</Text>
        <Text style={styles.heroSubtitle}>
          {t('exploreScreen.heroSubtitle')}
        </Text>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={Colors.slate500} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('exploreScreen.searchPlaceholder')}
            placeholderTextColor={Colors.slate400}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'products', 'auctions', 'blogs'] as ExploreSectionKey[]).map(
          (section) => (
            <TouchableOpacity
              key={section}
              style={[
                styles.filterChip,
                activeSection === section && styles.filterChipActive,
              ]}
              activeOpacity={0.84}
              onPress={() => setActiveSection(section)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeSection === section && styles.filterChipTextActive,
                ]}
              >
                {t(`exploreScreen.${section}`)}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </View>

      {hasQuery ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('exploreScreen.searchResults')}
          </Text>
          {renderSearchResults()}
        </View>
      ) : (
        <>
          <Text style={styles.hintText}>{t('exploreScreen.searchHint')}</Text>
          {renderDiscoveryState()}
        </>
      )}
    </ScrollView>
  );
}
