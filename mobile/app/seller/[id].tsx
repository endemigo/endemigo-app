import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SellerNotFoundError, useSeller } from '../../hooks/useSeller';
import { Colors } from '../../constants/theme';
import { styles } from './_id.styles';
import { ListingType, type Product } from '@/types';
import { useCartStore } from '../../store/cartStore';
import { useToastStore } from '../../store/toastStore';
import { formatCurrency } from '../../utils/transactionFormatters';

type IoniconName = keyof typeof Ionicons.glyphMap;

const GEO_BADGE_LOGOS = {
  PDO: require('../../assets/images/geo-indications/pdo.png'),
  PGI: require('../../assets/images/geo-indications/pgi.png'),
  TSG: require('../../assets/images/geo-indications/tsg.png'),
} as const;

/* ─── Stat Box ──────────────────────────────────────────────── */
function StatBox({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ─── Star Rating ──────────────────────────────────────────── */
function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const half = rating - fullStars >= 0.5;
  return (
    <View style={styles.ratingRow}>
      {Array.from({ length: 5 }).map((_, i) => {
        const name: IoniconName = i < fullStars ? 'star' : i === fullStars && half ? 'star-half' : 'star-outline';
        return (
          <Ionicons key={i} name={name} size={14} color={Colors.accent} />
        );
      })}
      <Text style={styles.ratingValue}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
}

/* ─── Product Card ──────────────────────────────────────────── */
function SellerProductCard({
  product,
  onPress,
  onQuickAction,
  quickActionIcon,
  quickActionLabel,
  quickActionStyle,
}: {
  product: Product;
  onPress: () => void;
  onQuickAction: () => void;
  quickActionIcon: 'cart' | 'chatbubble-ellipses' | 'hammer';
  quickActionLabel: string;
  quickActionStyle: StyleProp<ViewStyle>;
}) {
  const hasGeoIndication = Boolean(product.geoIndicationCertNo || product.geoIndicationRegion);
  const resolvedGeoTypes = product.geoIndicationTypes?.length
    ? product.geoIndicationTypes
    : product.geoIndicationType
      ? [product.geoIndicationType]
      : [];
  const geoBadgeLogos = resolvedGeoTypes
    .map((type) => GEO_BADGE_LOGOS[type])
    .filter(Boolean)
    .slice(0, 3);

  return (
    <View style={styles.productCard}>
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <View style={styles.productImageWrap}>
          <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="cover" />
          {hasGeoIndication && geoBadgeLogos.length > 0 ? (
            <View style={styles.geoBadgeLogosRow}>
              {geoBadgeLogos.map((logo, index) => (
                <Image key={`seller-geo-${product.id}-${index}`} source={logo} style={styles.geoBadgeLogo} resizeMode="contain" />
              ))}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
      <View style={styles.productContent}>
        <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
          <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
        </TouchableOpacity>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
          <TouchableOpacity
            style={[styles.quickActionButtonBase, quickActionStyle]}
            activeOpacity={0.85}
            onPress={onQuickAction}
            accessibilityRole="button"
            accessibilityLabel={quickActionLabel}
          >
            <Ionicons name={quickActionIcon} size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ─── Seller Screen ──────────────────────────────────────────── */
export default function SellerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, error } = useSeller(id);
  const addItem = useCartStore((state) => state.addItem);
  const showToast = useToastStore((state) => state.showToast);
  const isSellerNotFound = error instanceof SellerNotFoundError;

  const handleQuickAction = async (product: Product) => {
    if (product.askPriceEnabled) {
      router.push(`/product/${product.id}` as never);
      return;
    }

    if (product.listingType === ListingType.AUCTION) {
      router.push(`/product/${product.id}` as never);
      return;
    }

    try {
      await addItem({
        productId: product.id,
        title: product.title,
        price: Number(product.price ?? 0),
        imageUrl: product.imageUrl,
      });
      showToast({ message: t('cart.addedToCart'), type: 'success' });
    } catch {
      showToast({ message: t('common.genericError'), type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{isSellerNotFound ? t('seller.notFound') : t('common.genericError')}</Text>
      </View>
    );
  }

  const { profile, products } = data;
  const normalizedRating = Number.isFinite(profile.rating) ? Number(profile.rating) : 0;
  const normalizedReviewCount = Number.isFinite(profile.reviewCount) ? Number(profile.reviewCount) : 0;
  const hasRatingAndReviews = normalizedRating > 0 && normalizedReviewCount > 0;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <View style={styles.bannerContainer}>
          <Image source={{ uri: profile.banner }} style={styles.bannerImage} resizeMode="cover" />
          <View style={styles.bannerOverlay} />
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image source={{ uri: profile.avatar }} style={styles.avatar} resizeMode="cover" />
          <Text style={styles.sellerName}>{profile.name}</Text>

          {hasRatingAndReviews ? (
            <StarRating rating={normalizedRating} />
          ) : (
            <Text style={styles.noRatingReviewText}>{t('seller.noRatingAndReviews')}</Text>
          )}

          {profile.description ? (
            <Text style={styles.sellerBio}>{profile.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            {profile.location ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={Colors.slate400} />
                <Text style={styles.metaText}>{profile.location}</Text>
              </View>
            ) : null}
            {profile.since ? (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={Colors.slate400} />
                <Text style={styles.metaText}>{t('seller.memberSince')} {profile.since}</Text>
              </View>
            ) : null}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatBox value={String(profile.productCount)} label={t('seller.products')} />
            {hasRatingAndReviews ? (
              <>
                <View style={styles.statDivider} />
                <StatBox value={String(normalizedReviewCount)} label={t('seller.reviews')} />
              </>
            ) : null}
            <View style={styles.statDivider} />
            <StatBox value={String(profile.totalSales)} label={t('seller.sales')} />
          </View>

          {/* Trust Badges */}
          <View style={styles.trustRow}>
            {profile.trustBadges.map((badge) => {
              const badgeMap: Record<string, { icon: IoniconName; text: string; color: string }> = {
                verified: { icon: 'shield-checkmark', text: t('seller.verified'), color: Colors.secondary },
                fast_shipping: { icon: 'flash', text: t('seller.fastShipping'), color: Colors.accent },
                original: { icon: 'checkmark-circle', text: t('seller.original'), color: Colors.primary },
              };
              const b = badgeMap[badge];
              if (!b) return null;
              return (
                <View key={badge} style={styles.trustBadge}>
                  <Ionicons name={b.icon} size={14} color={b.color} />
                  <Text style={styles.trustText}>{b.text}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Products */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('seller.products')}</Text>
          <Text style={styles.sectionCount}>
            {t('seller.productsCount', { count: products.length })}
          </Text>
        </View>

        {products.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="cube-outline" size={40} color={Colors.slate300} />
            <Text style={styles.emptyTitle}>{t('seller.noProducts')}</Text>
            <Text style={styles.emptySub}>{t('seller.noProductsSub')}</Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {products.map((product) => {
              const quickActionIcon =
                product.askPriceEnabled
                  ? 'chatbubble-ellipses'
                  : product.listingType === ListingType.AUCTION
                    ? 'hammer'
                    : 'cart';
              const quickActionLabel =
                product.askPriceEnabled
                  ? t('product.askPrice')
                  : product.listingType === ListingType.AUCTION
                    ? t('auctions.bid')
                    : t('product.addToCart');
              const quickActionStyle =
                product.askPriceEnabled
                  ? styles.quickActionButtonAskPrice
                  : product.listingType === ListingType.AUCTION
                    ? styles.quickActionButtonAuction
                    : styles.quickActionButtonCart;

              return (
                <SellerProductCard
                  key={product.id}
                  product={product}
                  onPress={() => router.push(`/product/${product.id}` as never)}
                  onQuickAction={() => {
                    void handleQuickAction(product);
                  }}
                  quickActionIcon={quickActionIcon}
                  quickActionLabel={quickActionLabel}
                  quickActionStyle={quickActionStyle}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
