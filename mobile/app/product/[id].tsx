import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Modal, type ImageSourcePropType, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useProduct, useProducts } from '../../hooks/useProducts';
import { Colors, Spacing } from '../../constants/theme';
import { styles } from '../../styles/product/_id.styles';
import { getProductImageUri } from '../../utils/productImages';
import { useCartStore } from '../../store/cartStore';
import { useStartNegotiation } from '../../hooks/useNegotiations';
import { useToggleFavorite } from '../../hooks/useSearch';
import { useModalStore } from '../../store/modalStore';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useRecentlyViewedStore } from '../../store/recentlyViewedStore';
import { ProductCard, SectionHeader } from '../../components/ui';
import { formatCurrency } from '../../utils/transactionFormatters';
import { formatProductPrice } from '../../utils/productPriceFormatter';
import { resolveApiErrorMessage } from '../../utils/apiError';
import type { Product, StartNegotiationInput } from '../../types';
import { ListingType, AuctionStatus } from '@endemigo/shared';
import { useAuctionByProduct, useAuctionEventDetails } from '../../hooks/useAuctions';

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x300/F8F9FA/0097D8?text=Endemigo';
const GEO_BADGE_LOGOS = {
  PDO: require('../../assets/images/geo-indications/pdo.png'),
  PGI: require('../../assets/images/geo-indications/pgi.png'),
  TSG: require('../../assets/images/geo-indications/tsg.png'),
} as const;
const ENDMIGO_WEB_BADGE_BASE_URL = 'https://endemigo.com/source/images';
const PRODUCT_BADGE_IMAGE_BY_TOKEN: Record<string, string> = {
  geo_indication: `${ENDMIGO_WEB_BADGE_BASE_URL}/isaretyesilen.webp`,
  pdo: `${ENDMIGO_WEB_BADGE_BASE_URL}/isaretyesilen.webp`,
  pgi: `${ENDMIGO_WEB_BADGE_BASE_URL}/isaretyesilen.webp`,
  tsg: `${ENDMIGO_WEB_BADGE_BASE_URL}/isaretyesilen.webp`,
  verified: `${ENDMIGO_WEB_BADGE_BASE_URL}/isaretyesilen.webp`,
  fast_shipping: `${ENDMIGO_WEB_BADGE_BASE_URL}/souk.png`,
  cold_delivery: `${ENDMIGO_WEB_BADGE_BASE_URL}/souk.png`,
  original: `${ENDMIGO_WEB_BADGE_BASE_URL}/all-product.webp`,
};

type ProductTabKey = 'story' | 'description' | 'details' | 'shippingPayment';
type ProductVariantKind = 'COLOR' | 'SIZE' | 'NUMBER' | 'OPTION' | 'VARIATION';
type ProductVariantOption = {
  id: string;
  label: string;
  kind: ProductVariantKind;
  swatchHex?: string | null;
  imageUrl?: string | null;
  inStock?: boolean;
  stockQuantity?: number | null;
};
type ProductVariantSku = {
  id: string;
  colorVariantNumberId?: string | null;
  sizeVariantNumberId?: string | null;
  colorVariant?: {
    id: string;
    kind?: ProductVariantKind;
    nameTr?: string | null;
    nameEn?: string | null;
    swatchHex?: string | null;
  } | null;
  sizeVariant?: {
    id: string;
    kind?: ProductVariantKind;
    nameTr?: string | null;
    nameEn?: string | null;
    swatchHex?: string | null;
  } | null;
  skuCode?: string | null;
  stockQuantity?: number;
  priceOverride?: number | null;
  imageUrl?: string | null;
  isActive?: boolean;
};
type HeroBadgeItem = {
  id: string;
  source: ImageSourcePropType;
  title: string;
  description: string;
};
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function TopBar({
  title,
  onBack,
  onShare,
  onFavorite,
  isFavoriteActive,
}: {
  title: string;
  onBack: () => void;
  onShare: () => void;
  onFavorite: () => void;
  isFavoriteActive: boolean;
}) {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity style={styles.topBarIconButton} activeOpacity={0.8} onPress={onBack}>
        <Ionicons name="chevron-back" size={20} color={Colors.onSurface} />
      </TouchableOpacity>
      <Text style={styles.topBarTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.topBarActions}>
        <TouchableOpacity style={styles.topBarIconButton} activeOpacity={0.8} onPress={onShare}>
          <Ionicons name="share-outline" size={18} color={Colors.onSurface} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.topBarIconButton} activeOpacity={0.8} onPress={onFavorite}>
          <Ionicons
            name={isFavoriteActive ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavoriteActive ? Colors.accent : Colors.onSurface}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function HeroImage({
  imageUri,
  badgeItems,
  onBadgePress,
}: {
  imageUri: string;
  badgeItems: HeroBadgeItem[];
  onBadgePress: (badge: HeroBadgeItem) => void;
}) {
  return (
    <View style={styles.heroImageContainer}>
      <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
      {badgeItems.length > 0 ? (
        <View style={styles.heroSideBadges}>
          {badgeItems.map((badge) => (
            <TouchableOpacity key={badge.id} style={styles.heroSideBadgePill} activeOpacity={0.85} onPress={() => onBadgePress(badge)}>
              <Image source={badge.source} style={styles.heroSideBadgeImage} resizeMode="contain" />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PurchasePanel({
  isAskPrice,
  product,
  t,
  cartQuantity,
  cartUnitLabel,
  onAddToCart,
  onDecreaseQuantity,
  onIncreaseQuantity,
  onAskPrice,
  onAskQuestion,
}: {
  isAskPrice: boolean;
  product: Product;
  t: ReturnType<typeof useTranslation>['t'];
  cartQuantity: number;
  cartUnitLabel: string;
  onAddToCart: () => void;
  onDecreaseQuantity: () => void;
  onIncreaseQuantity: () => void;
  onAskPrice: () => void;
  onAskQuestion: () => void;
}) {
  return (
    <View style={styles.purchaseCard}>
      {!isAskPrice && (
        <View style={styles.purchasePriceRow}>
          <Text style={styles.purchasePrice}>{formatProductPrice(product, t)}</Text>
          {/* "/ adet" yalnızca gerçek fiyat varken; müzayede/fiyat-sor'da gizli. */}
          {product.listingType !== ListingType.AUCTION && Number(product.price) > 0 && (
            <Text style={styles.purchaseUnitText}>{t('product.perUnit')}</Text>
          )}
        </View>
      )}

      {isAskPrice ? (
        <TouchableOpacity style={styles.primaryActionButton} activeOpacity={0.85} onPress={onAskPrice}>
          <Ionicons name="cash-outline" size={16} color={Colors.white} />
          <Text style={styles.primaryActionText}>{t('product.askPrice')}</Text>
        </TouchableOpacity>
      ) : cartQuantity > 0 ? (
        <View style={styles.inlineQuantityStepper}>
          <TouchableOpacity style={styles.inlineQuantityButton} activeOpacity={0.85} onPress={onDecreaseQuantity}>
            <Ionicons name="remove" size={16} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.inlineQuantityValue}>{`${cartQuantity} ${cartUnitLabel} ${t('product.inCartSuffix')}`}</Text>
          <TouchableOpacity style={styles.inlineQuantityButton} activeOpacity={0.85} onPress={onIncreaseQuantity}>
            <Ionicons name="add" size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.primaryActionButton} activeOpacity={0.85} onPress={onAddToCart}>
          <Ionicons name="cart-outline" size={16} color={Colors.white} />
          <Text style={styles.primaryActionText}>{t('product.addToCart')}</Text>
        </TouchableOpacity>
      )}

      {Boolean(product.askQuestionEnabled) && (
        <TouchableOpacity style={styles.secondaryActionButton} activeOpacity={0.85} onPress={onAskQuestion}>
          <Ionicons name="chatbubble-outline" size={16} color={Colors.onSurface} />
          <Text style={styles.secondaryActionText}>{t('product.askQuestion', { defaultValue: 'Soru Sor' })}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { data: product, isLoading } = useProduct(id);
  const { data: auction } = useAuctionByProduct(id, product?.listingType === ListingType.AUCTION);
  const { data: eventDetails } = useAuctionEventDetails(auction?.eventId ?? '');

  const { prevLot, nextLot, currentLotIndex, totalLots } = React.useMemo(() => {
    const lots = eventDetails?.lots ?? [];
    if (!lots.length || !auction) return { prevLot: null, nextLot: null, currentLotIndex: -1, totalLots: 0 };
    const idx = lots.findIndex((l) => l.id === auction.id);
    return {
      prevLot: idx > 0 ? lots[idx - 1] : null,
      nextLot: idx !== -1 && idx < lots.length - 1 ? lots[idx + 1] : null,
      currentLotIndex: idx,
      totalLots: lots.length,
    };
  }, [eventDetails, auction]);
  const { data: productsData } = useProducts(1);
  const addItem = useCartStore((state) => state.addItem);
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const cartItems = useCartStore((state) => state.items);
  const showModal = useModalStore((state) => state.showModal);
  const hideModal = useModalStore((state) => state.hideModal);
  const showToast = useToastStore((state) => state.showToast);
  const toggleFavorite = useToggleFavorite();
  const startNegotiation = useStartNegotiation();
  const [activeTab, setActiveTab] = React.useState<ProductTabKey>('story');
  const [tabsHintDirection, setTabsHintDirection] = React.useState<'right' | 'left'>('right');
  const [reviewModalVisible, setReviewModalVisible] = React.useState(false);
  const [badgeModalVisible, setBadgeModalVisible] = React.useState(false);
  const [selectedBadge, setSelectedBadge] = React.useState<HeroBadgeItem | null>(null);
  const [reviewCursor, setReviewCursor] = React.useState(0);
  const [contentStartY, setContentStartY] = React.useState(0);
  const [purchasePanelBottomY, setPurchasePanelBottomY] = React.useState<number | null>(null);
  const [showStickyAddToCart, setShowStickyAddToCart] = React.useState(false);
  const [selectedColorVariantId, setSelectedColorVariantId] = React.useState<string | null>(null);
  const [selectedSizeVariantId, setSelectedSizeVariantId] = React.useState<string | null>(null);
  const [favoriteActive, setFavoriteActive] = React.useState(false);
  const [prevProductFavorited, setPrevProductFavorited] = React.useState<boolean | undefined>(undefined);
  const stickyCtaProgress = useSharedValue(0);
  const recommendedProducts = React.useMemo(() => {
    if (!product) return [];

    const items = productsData?.items ?? [];
    if (!items.length) return [];

    const sameCategory = items.filter(
      (item) =>
        item.id !== product.id
        && (item.categoryId === product.categoryId || item.categoryName === product.categoryName),
    );
    const fallback = items.filter(
      (item) => item.id !== product.id && !sameCategory.some((same) => same.id === item.id),
    );

    return [...sameCategory, ...fallback].slice(0, 6);
  }, [product, productsData?.items]);

  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isLocalFavorited = useFavoritesStore((state) => state.items.some((p) => p.id === id));
  const currentProductFavorited = isLoggedIn ? Boolean(product?.isFavorited) : isLocalFavorited;

  if (prevProductFavorited !== currentProductFavorited) {
    setPrevProductFavorited(currentProductFavorited);
    setFavoriteActive(currentProductFavorited);
  }

  const stickyCtaAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stickyCtaProgress.value, [0, 1], [0, 1]),
    transform: [
      { translateY: interpolate(stickyCtaProgress.value, [0, 1], [92, 0]) },
    ],
  }));

  const badgeItems = React.useMemo(
    () => (product ? collectHeroBadgeItems(product, t) : []),
    [product, t],
  );
  const reviewItems = React.useMemo(
    () => (product ? resolveProductReviews(product) : []),
    [product],
  );
  const latestComments = React.useMemo(
    () =>
      reviewItems
        .map((item) => item.comment)
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0),
    [reviewItems],
  );
  const sortedReviews = React.useMemo(
    () => [...reviewItems].sort((a, b) => getReviewTime(b.createdAt) - getReviewTime(a.createdAt)),
    [reviewItems],
  );
  const tabItems: { key: ProductTabKey; label: string }[] = [
    { key: 'story', label: t('product.tabStory') },
    { key: 'description', label: t('product.tabDescriptions') },
    { key: 'details', label: t('product.tabDetails') },
    { key: 'shippingPayment', label: t('product.tabShippingPayment') },
  ];
  const activeComment = latestComments.length > 0 ? latestComments[reviewCursor % latestComments.length] : t('product.noReviewComment');
  const productVariantOptions = React.useMemo(
    () => (product ? extractVariantOptions(product) : []),
    [product],
  );
  const productVariantSkus = React.useMemo(
    () => (product ? extractVariantSkus(product) : []),
    [product],
  );
  const colorVariants = React.useMemo(
    () => productVariantOptions.filter((option) => option.kind === 'COLOR'),
    [productVariantOptions],
  );
  const sizeVariants = React.useMemo(
    () => productVariantOptions.filter((option) => option.kind !== 'COLOR'),
    [productVariantOptions],
  );
  const selectedColorVariant = colorVariants.find((variant) => variant.id === selectedColorVariantId) ?? null;
  const selectedSizeVariant = sizeVariants.find((variant) => variant.id === selectedSizeVariantId) ?? null;
  const selectedProductVariantSku = React.useMemo(
    () => resolveSelectedVariantSku(productVariantSkus, selectedColorVariantId, selectedSizeVariantId),
    [productVariantSkus, selectedColorVariantId, selectedSizeVariantId],
  );
  const selectedCartVariantId = selectedSizeVariantId ?? selectedColorVariantId ?? null;
  const currentCartItem = React.useMemo(() => {
    if (!product) return null;
    return cartItems.find(
      (item) =>
        item.productId === product.id
        && (item.productVariantSkuId ?? null) === (selectedProductVariantSku?.id ?? null)
        && (item.variantId ?? null) === selectedCartVariantId,
    ) ?? null;
  }, [cartItems, product, selectedCartVariantId, selectedProductVariantSku?.id]);
  const cartQuantity = currentCartItem?.quantity ?? 0;
  const cartItemId = currentCartItem?.id;

  React.useEffect(() => {
    setReviewCursor(0);
  }, [id, latestComments.length]);

  React.useEffect(() => {
    setSelectedColorVariantId(null);
    setSelectedSizeVariantId(null);
  }, [id]);

  React.useEffect(() => {
    if (latestComments.length <= 1) return undefined;
    const timer = setInterval(() => {
      setReviewCursor((prev) => (prev + 1) % latestComments.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [latestComments.length]);

  React.useEffect(() => {
    setPurchasePanelBottomY(null);
    setShowStickyAddToCart(false);
  }, [id]);

  React.useEffect(() => {
    stickyCtaProgress.value = withTiming(showStickyAddToCart ? 1 : 0, {
      duration: showStickyAddToCart ? 320 : 180,
      easing: showStickyAddToCart ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
    });
  }, [showStickyAddToCart, stickyCtaProgress]);

  const recordView = useRecentlyViewedStore((state) => state.recordView);

  React.useEffect(() => {
    if (product?.id) {
      recordView(product.id).catch(() => {});
    }
  }, [product?.id, recordView]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{t('product.notFound')}</Text>
      </View>
    );
  }

  const productImageUri = getProductImageUri(product, PLACEHOLDER_IMAGE);
  const hasPrice = product.price !== undefined && product.price !== null && !isNaN(Number(product.price)) && Number(product.price) > 0;
  const isAskPrice = Boolean(product.askPriceEnabled) || !hasPrice;
  const resolvedGeoTypes = product.geoIndicationTypes?.length
    ? product.geoIndicationTypes
    : product.geoIndicationType
      ? [product.geoIndicationType]
      : [];
  const cartUnitLabel = resolveProductUnitLabel(product, t);
  const brandName = product.brand?.trim() || '';
  const geoIndicationName = resolveGeoIndicationName(product);
  const hasGeoIndicationInfo = Boolean(geoIndicationName || product.geoIndicationRegion);
  const geoTypeBadges = resolvedGeoTypes
    .map((type) => {
      const token = String(type).toUpperCase();
      return {
        key: token,
        logo: GEO_BADGE_LOGOS[token as keyof typeof GEO_BADGE_LOGOS] ?? null,
        label: t(`product.logo.${String(type).toLowerCase()}.title`, { defaultValue: token }),
      };
    })
    .filter((entry, index, list) => list.findIndex((item) => item.key === entry.key) === index);
  const normalizedRating = Number.isFinite(product.rating) ? Math.max(0, Math.min(5, Number(product.rating))) : null;
  const reviewRatingText = normalizedRating !== null ? `${normalizedRating.toFixed(1)} / 5` : t('product.infoNotAvailable');
  const reviewCount = Number.isFinite(product.reviewCount) ? Number(product.reviewCount) : 0;
  const hasRatingAndReviews = reviewCount > 0 || reviewItems.length > 0 || (normalizedRating !== null && normalizedRating > 0);

  const handleAskPrice = () => {
    if (!isLoggedIn) {
      showModal({
        title: t('auth.loginRequired', { defaultValue: 'Giriş Gerekli' }),
        message: t('auth.loginRequiredMessage', { defaultValue: 'Fiyat sormak için lütfen önce giriş yapın.' }),
        type: 'info',
        confirmText: t('auth.login', { defaultValue: 'Giriş Yap' }),
        cancelText: t('common.cancel', { defaultValue: 'İptal' }),
        onConfirm: () => {
          hideModal();
          router.push('/(auth)/login');
        },
      });
      return;
    }

    startNegotiation.mutate({
      productId: product.id,
      amount: null,
      quantity: 1,
      note: t('negotiation.askPrice.defaultMessage', { defaultValue: 'Merhaba, bu ürünün fiyatını öğrenebilir miyim?' }),
    }, {
      onSuccess: (negotiation) => {
        router.push(`/negotiation/${negotiation.id}` as never);
      },
      onError: () => {
        showModal({
          title: t('common.error'),
          message: t('negotiation.askPrice.error', { defaultValue: 'Fiyat sorma işlemi başlatılamadı.' }),
          type: 'error',
        });
      },
    });
  };

  const handleAskQuestion = () => {
    if (!isLoggedIn) {
      showModal({
        title: t('auth.loginRequired', { defaultValue: 'Giriş Gerekli' }),
        message: t('auth.loginRequiredMessage', { defaultValue: 'Soru sormak için lütfen önce giriş yapın.' }),
        type: 'info',
        confirmText: t('auth.login', { defaultValue: 'Giriş Yap' }),
        cancelText: t('common.cancel', { defaultValue: 'İptal' }),
        onConfirm: () => {
          hideModal();
          router.push('/(auth)/login');
        },
      });
      return;
    }

    startNegotiation.mutate({
      productId: product.id,
      amount: null,
      quantity: 1,
    }, {
      onSuccess: (negotiation) => {
        router.push(`/negotiation/${negotiation.id}` as never);
      },
      onError: () => {
        showModal({
          title: t('common.error'),
          message: t('negotiation.askQuestion.error', { defaultValue: 'Soru sorma işlemi başlatılamadı.' }),
          type: 'error',
        });
      },
    });
  };

  const handleToggleFavorite = async () => {
    if (!id) return;
    try {
      const response = await toggleFavorite.mutateAsync(id);
      setFavoriteActive(response.isFavorited);
      showToast({
        message: t(`api.${response.code}`, { defaultValue: response.message }),
        type: 'success',
      });
    } catch (error) {
      showModal({
        title: t('common.error'),
        message: resolveApiErrorMessage(error, t, 'common.genericError'),
        type: 'error',
      });
    }
  };

  const handlePolicyViolation = () => {
    showModal({
      title: t('negotiation.policy.title'),
      message: t('negotiation.policy.message'),
      type: 'error',
    });
  };

  const handleAddToCart = async () => {
    if (colorVariants.length > 0 && !selectedColorVariantId) {
      showModal({
        title: t('common.error'),
        message: t('product.pleaseSelectColor', { defaultValue: 'Lütfen bir renk seçin.' }),
        type: 'error',
      });
      return;
    }

    if (sizeVariants.length > 0 && !selectedSizeVariantId) {
      showModal({
        title: t('common.error'),
        message: t('product.pleaseSelectSize', { defaultValue: 'Lütfen bir beden veya numara seçin.' }),
        type: 'error',
      });
      return;
    }

    if (productVariantSkus.length > 0 && !selectedProductVariantSku) {
      showModal({
        title: t('common.error'),
        message: t('product.variantCombinationUnavailable'),
        type: 'error',
      });
      return;
    }
    try {
      await addItem({
        productId: product.id,
        productVariantSkuId: selectedProductVariantSku?.id ?? null,
        variantId: selectedCartVariantId,
        title: product.title,
        price: Number(product.price),
        imageUrl: productImageUri,
        sellerId: product.sellerId,
      });

      showToast({ message: t('cart.addedToCart'), type: 'success' });
    } catch {
      showModal({
        title: t('common.error'),
        message: t('common.genericError'),
        type: 'error',
      });
    }
  };

  const handleIncreaseQuantity = async () => {
    if (!cartItemId || cartQuantity >= 99) return;
    try {
      await updateItemQuantity(cartItemId, cartQuantity + 1);
    } catch {
      showModal({
        title: t('common.error'),
        message: t('common.genericError'),
        type: 'error',
      });
    }
  };

  const handleDecreaseQuantity = async () => {
    if (!cartItemId) return;
    try {
      if (cartQuantity <= 1) {
        await removeItem(cartItemId);
        showToast({ message: t('cart.itemRemoved'), type: 'info' });
        return;
      }
      await updateItemQuantity(cartItemId, cartQuantity - 1);
    } catch {
      showModal({
        title: t('common.error'),
        message: t('common.genericError'),
        type: 'error',
      });
    }
  };

  function renderTabContent(currentProduct: NonNullable<typeof product>) {
    if (activeTab === 'story') {
      return (
        <View style={styles.tabContentCard}>
          <Text style={styles.tabContentTitle}>{t('product.storyHeading')}</Text>
          <Text style={styles.tabContentText}>
            {currentProduct.sellerNotes?.trim() || t('product.storyDefault')}
          </Text>
        </View>
      );
    }

    if (activeTab === 'description') {
      return (
        <View style={styles.tabContentCard}>
          <Text style={styles.tabContentText}>
            {currentProduct.description?.trim() || t('product.noDescription')}
          </Text>
        </View>
      );
    }

    if (activeTab === 'details') {
      const productionSeasonsValue = formatProductionSeasons(currentProduct, t);
      const salesMonthsValue = formatSalesMonths(currentProduct.salesMonths);
      const featureBadgesValue = formatStringArray(currentProduct.featureBadges);
      const geoBadgeSelectionsValue = formatStringArray(currentProduct.geoBadgeSelections);
      const detailRows = [
        { label: t('listing.sku'), value: currentProduct.sku },
        { label: t('listing.brand'), value: currentProduct.brand },
        { label: t('listing.originCountry'), value: currentProduct.originCountry },
        { label: t('listing.originRegion'), value: currentProduct.originRegion },
        { label: t('listing.productionProvince'), value: currentProduct.productionProvince },
        { label: t('listing.productionDistrict'), value: currentProduct.productionDistrict },
        { label: t('listing.productionSeason'), value: productionSeasonsValue },
        { label: t('listing.salesMonths'), value: salesMonthsValue },
        { label: t('listing.weight'), value: formatNumberValue(currentProduct.weight) },
        { label: t('listing.width'), value: formatNumberValue(currentProduct.dimensionWidth) },
        { label: t('listing.height'), value: formatNumberValue(currentProduct.dimensionHeight) },
        { label: t('listing.depth'), value: formatNumberValue(currentProduct.dimensionDepth) },
        { label: t('listing.barcodeNo'), value: currentProduct.barcodeNo },
        { label: t('listing.productContent'), value: currentProduct.productContent },
        { label: t('listing.geoIndicationReceivedAt'), value: currentProduct.geoIndicationReceivedAt },
        { label: t('listing.geoIndicationCertNo'), value: currentProduct.geoIndicationCertNo },
        { label: t('listing.geoIndicationRegion'), value: currentProduct.geoIndicationRegion },
        { label: t('listing.featureBadges'), value: featureBadgesValue },
        { label: t('listing.geoBadgeSelections'), value: geoBadgeSelectionsValue },
        { label: t('listing.additionalCertificates'), value: currentProduct.additionalCertificates },
        {
          label: t('listing.endemigoBrandQuestion'),
          value: currentProduct.isEndemigoBrandCandidate ? t('common.yes', { defaultValue: 'Evet' }) : '',
        },
      ].filter((item) => hasDisplayValue(item.value));

      return (
        <View style={styles.tabContentCard}>
          {detailRows.length > 0 ? detailRows.map((item) => (
            <View key={`${item.label}-${item.value}`} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={styles.detailValue}>{String(item.value)}</Text>
            </View>
          )) : (
            <Text style={styles.tabContentText}>{t('product.detailsEmpty')}</Text>
          )}
        </View>
      );
    }

    return (
      <View style={styles.tabContentCard}>
        {[
          { label: t('listing.shippingProvince'), value: currentProduct.shippingProvince },
          { label: t('listing.shippingDistrict'), value: currentProduct.shippingDistrict },
          { label: t('listing.shippingAddress'), value: currentProduct.shippingAddress },
          { label: t('listing.deliveryTemplateDomestic'), value: currentProduct.deliveryTemplateDomestic },
          { label: t('listing.deliveryTemplateInternational'), value: currentProduct.deliveryTemplateInternational },
          { label: t('listing.desiDomestic'), value: currentProduct.desiDomestic },
          { label: t('listing.desiInternational'), value: currentProduct.desiInternational },
          { label: t('listing.wholesalePrice'), value: formatOptionalPrice(currentProduct.wholesalePrice) },
          { label: t('listing.retailPrice'), value: formatOptionalPrice(currentProduct.retailPrice) },
        ].filter((item) => hasDisplayValue(item.value)).map((item) => (
          <View key={`${item.label}-${item.value}`} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{item.label}</Text>
            <Text style={styles.detailValue}>{String(item.value)}</Text>
          </View>
        ))}
        {![
          currentProduct.shippingProvince,
          currentProduct.shippingDistrict,
          currentProduct.shippingAddress,
          currentProduct.deliveryTemplateDomestic,
          currentProduct.deliveryTemplateInternational,
          currentProduct.desiDomestic,
          currentProduct.desiInternational,
          currentProduct.wholesalePrice,
          currentProduct.retailPrice,
        ].some((value) => hasDisplayValue(value)) ? (
          <Text style={styles.tabContentText}>{t('product.detailsEmpty')}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar
        title={toTurkishUppercase(product.categoryName || t('tabs.home'))}
        onBack={() => router.back()}
        onShare={() => showToast({ message: t('common.comingSoon', { defaultValue: 'Yakında' }), type: 'info' })}
        onFavorite={handleToggleFavorite}
        isFavoriteActive={favoriteActive}
      />
      {product.listingType === ListingType.AUCTION && auction && (
        <TouchableOpacity
          style={[
            styles.auctionHeaderBanner,
            auction.status === AuctionStatus.ACTIVE && { backgroundColor: Colors.error },
          ]}
          activeOpacity={0.85}
          onPress={() => {
            // Canlıysa salona, değilse lot ilanına götür — köprü tek dokunuş.
            if (auction.eventId) {
              router.push(`/auction/event/${auction.eventId}` as never);
            } else {
              router.push(`/auction/${auction.id}` as never);
            }
          }}
        >
          <Ionicons
            name={auction.status === AuctionStatus.ACTIVE ? 'radio-outline' : 'time-outline'}
            size={16}
            color={Colors.white}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.auctionHeaderBannerText} numberOfLines={1}>
            {auction.status === AuctionStatus.ACTIVE
              ? `${t('auctions.live').toLocaleUpperCase('tr-TR')} · `
              : ''}
            {eventDetails?.event?.title ? `${eventDetails.event.title} | ` : ''}
            {t('auction.lotNumber', { defaultValue: 'Lot Kodu' })}: {auction.lotNumber}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.white} />
        </TouchableOpacity>
      )}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollView}
        scrollEventThrottle={16}
        onScroll={({ nativeEvent }) => {
          // Ask-price ürünlerde de sticky CTA gösterilir ("Fiyat Sor" varyantı) —
          // uzun sayfada aşağıdayken ana aksiyon kaybolmamalı.
          if (purchasePanelBottomY === null) {
            if (showStickyAddToCart) setShowStickyAddToCart(false);
            return;
          }

          const threshold = contentStartY + purchasePanelBottomY + Spacing.sm;
          const shouldShow = nativeEvent.contentOffset.y > threshold;
          if (showStickyAddToCart !== shouldShow) {
            setShowStickyAddToCart(shouldShow);
          }
        }}
      >

        <HeroImage
          imageUri={productImageUri}
          badgeItems={badgeItems}
          onBadgePress={(badge) => {
            setSelectedBadge(badge);
            setBadgeModalVisible(true);
          }}
        />

        <View
          style={styles.content}
          onLayout={({ nativeEvent }) => {
            setContentStartY(nativeEvent.layout.y);
          }}
        >
          <View style={styles.summaryBlock}>
            <Text style={styles.sellerKicker}>{product.sellerName}</Text>
            <Text style={styles.title}>{product.title}</Text>
            <Text style={styles.summaryText}>
              {product.description?.trim() || t('product.noDescription')}
            </Text>
          </View>

          {brandName ? (
            <TouchableOpacity
              style={styles.brandCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/brand/${encodeURIComponent(brandName)}`)}
            >
              <View style={styles.brandCardTextWrap}>
                <Text style={styles.brandCardLabel}>{t('listing.brand')}</Text>
                <Text style={styles.brandCardValue} numberOfLines={1}>{brandName}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          ) : null}

          {hasGeoIndicationInfo ? (
            <View style={styles.geoInfoCard}>
              <View style={styles.geoInfoHeader}>
                <View style={styles.geoInfoTitleRow}>
                  <View style={styles.geoInfoTitleIconWrap}>
                    <Ionicons name="ribbon-outline" size={14} color={Colors.primary} />
                  </View>
                  <Text style={styles.geoInfoTitle}>{t('product.geoInfoTitle')}</Text>
                </View>
                {geoTypeBadges.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.geoTypeBadgeRow}
                  >
                    {geoTypeBadges.map((badge) => (
                      <View key={`geo-badge-${badge.key}`} style={styles.geoTypeBadgeChip}>
                        {badge.logo ? (
                          <Image source={badge.logo} style={styles.geoTypeBadgeLogo} resizeMode="contain" />
                        ) : null}
                        <Text style={styles.geoTypeBadgeLabel}>{badge.label}</Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
              <View style={styles.geoInfoRow}>
                <Text style={styles.geoInfoLabel}>{t('product.geoInfoNameLabel')}</Text>
                <Text style={styles.geoInfoValue}>{geoIndicationName || t('product.infoNotAvailable')}</Text>
              </View>
              <View style={styles.geoInfoRow}>
                <Text style={styles.geoInfoLabel}>{t('product.geoInfoRegionLabel')}</Text>
                <Text style={styles.geoInfoValue}>{product.geoIndicationRegion || t('product.infoNotAvailable')}</Text>
              </View>
            </View>
          ) : null}

          {product.listingType === ListingType.AUCTION && auction ? (
            <View style={styles.lotNavigationCard}>
              <View style={styles.lotNavigationRow}>
                <TouchableOpacity
                  style={[styles.lotNavButton, !prevLot && styles.lotNavButtonDisabled]}
                  disabled={!prevLot}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (prevLot) {
                      router.replace({ pathname: '/product/[id]', params: { id: prevLot.productId } });
                    }
                  }}
                >
                  <Ionicons name="chevron-back" size={14} color={Colors.onSurfaceVariant} />
                  <Text style={styles.lotNavButtonText}>{t('common.previous', { defaultValue: 'Önceki' })}</Text>
                </TouchableOpacity>

                <Text style={styles.lotNavCenterText}>
                  {t('auction.lot', { defaultValue: 'Lot' })} {auction.sequenceNumber ?? currentLotIndex + 1} / {totalLots || 1}
                </Text>

                <TouchableOpacity
                  style={[styles.lotNavButton, !nextLot && styles.lotNavButtonDisabled]}
                  disabled={!nextLot}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (nextLot) {
                      router.replace({ pathname: '/product/[id]', params: { id: nextLot.productId } });
                    }
                  }}
                >
                  <Text style={styles.lotNavButtonText}>{t('common.next', { defaultValue: 'Sonraki' })}</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <View style={{ height: Spacing.base }} />

              <TouchableOpacity
                style={styles.auctionBidActionButton}
                activeOpacity={0.85}
                onPress={() => {
                  if (!isLoggedIn) {
                    showModal({
                      title: t('auth.loginRequired', { defaultValue: 'Giriş Gerekli' }),
                      message: t('auth.loginRequiredMessage', { defaultValue: 'Teklif vermek için lütfen önce giriş yapın.' }),
                      type: 'info',
                      confirmText: t('auth.login', { defaultValue: 'Giriş Yap' }),
                      cancelText: t('common.cancel', { defaultValue: 'İptal' }),
                      onConfirm: () => {
                        hideModal();
                        router.push('/(auth)/login');
                      },
                    });
                  } else if (auction) {
                    router.push(`/auction/${auction.id}` as never);
                  }
                }}
              >
                <Ionicons name="hammer-outline" size={16} color={Colors.white} />
                <Text style={styles.auctionBidActionText}>{t('auction.placeBid', { defaultValue: 'Teklif Ver' })}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveItemButton}
                activeOpacity={0.85}
                onPress={handleToggleFavorite}
              >
                <Ionicons
                  name={favoriteActive ? 'heart' : 'heart-outline'}
                  size={16}
                  color={favoriteActive ? Colors.accent : Colors.onSurface}
                />
                <Text style={styles.saveItemButtonText}>
                  {favoriteActive ? t('product.favorited', { defaultValue: 'Favorilerde' }) : t('product.saveItem', { defaultValue: 'Favoriye Ekle' })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : product.listingType === ListingType.AUCTION ? (
            // Müzayede ürünü tek başına satılmaz; auction kaydı yüklenmemişse
            // sepet paneli yerine bilgilendirme gösterilir.
            <View style={styles.purchaseCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="hammer-outline" size={18} color={Colors.primary} />
                <Text style={{ flex: 1, color: Colors.onSurfaceVariant, fontSize: 14 }}>
                  {t('product.auctionOnlyNotice', {
                    defaultValue: 'Bu ürün yalnızca müzayede etkinliği üzerinden satılır.',
                  })}
                </Text>
              </View>
            </View>
          ) : (
            <View
              onLayout={({ nativeEvent }) => {
                const { y, height } = nativeEvent.layout;
                setPurchasePanelBottomY(y + height);
              }}
            >
              <PurchasePanel
                isAskPrice={isAskPrice}
                product={product}
                t={t}
                cartQuantity={cartQuantity}
                cartUnitLabel={cartUnitLabel}
                onAddToCart={handleAddToCart}
                onDecreaseQuantity={handleDecreaseQuantity}
                onIncreaseQuantity={handleIncreaseQuantity}
                onAskPrice={handleAskPrice}
                onAskQuestion={handleAskQuestion}
              />
            </View>
          )}

          {colorVariants.length > 0 || sizeVariants.length > 0 ? (
            <View style={styles.variantSectionCard}>
              {colorVariants.length > 0 ? (
                <View style={styles.variantGroupWrap}>
                  <Text style={styles.variantGroupTitle}>
                    {`${t('product.variantColorLabel')}: ${selectedColorVariant?.label ?? t('common.select', { defaultValue: 'Seçiniz' })}`}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorVariantRow}>
                    {colorVariants.map((variant) => {
                      const isSelected = selectedColorVariantId === variant.id;
                      const isOutOfStock = variant.inStock === false;
                      return (
                        <TouchableOpacity
                          key={variant.id}
                          style={[
                            styles.colorVariantCard,
                            isSelected && styles.colorVariantCardActive,
                            isOutOfStock && styles.variantOptionDisabled,
                          ]}
                          activeOpacity={0.9}
                          onPress={() => setSelectedColorVariantId(variant.id)}
                        >
                          <View style={styles.colorVariantImageWrap}>
                            {variant.imageUrl ? (
                              <Image source={{ uri: variant.imageUrl }} style={styles.colorVariantImage} resizeMode="cover" />
                            ) : (
                              <View
                                style={[
                                  styles.colorVariantSwatchFallback,
                                  { backgroundColor: variant.swatchHex || Colors.slate200 },
                                ]}
                              />
                            )}
                            {isOutOfStock ? (
                              <View style={styles.variantOutOfStockOverlay}>
                                <Text style={styles.variantOutOfStockText}>{t('product.variantOutOfStock')}</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text
                            style={[
                              styles.colorVariantLabel,
                              isSelected && styles.colorVariantLabelActive,
                              isOutOfStock && styles.variantOptionLabelDisabled,
                            ]}
                            numberOfLines={1}
                          >
                            {variant.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              {sizeVariants.length > 0 ? (
                <View style={styles.variantGroupWrap}>
                  <Text style={styles.variantGroupTitle}>
                    {`${t('product.variantSizeLabel')}: ${selectedSizeVariant?.label ?? t('common.select', { defaultValue: 'Seçiniz' })}`}
                  </Text>
                  <View style={styles.sizeVariantWrap}>
                    {sizeVariants.map((variant) => {
                      const isSelected = selectedSizeVariantId === variant.id;
                      const isOutOfStock = variant.inStock === false;
                      return (
                        <TouchableOpacity
                          key={variant.id}
                          style={[
                            styles.sizeVariantChip,
                            isSelected && styles.sizeVariantChipActive,
                            isOutOfStock && styles.variantOptionDisabled,
                          ]}
                          activeOpacity={0.9}
                          onPress={() => setSelectedSizeVariantId(variant.id)}
                        >
                          <Text
                            style={[
                              styles.sizeVariantChipText,
                              isSelected && styles.sizeVariantChipTextActive,
                              isOutOfStock && styles.variantOptionLabelDisabled,
                            ]}
                          >
                            {variant.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.tabsWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsRow}
              onScroll={({ nativeEvent }) => {
                const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
                const remainingRight = contentSize.width - (contentOffset.x + layoutMeasurement.width);
                setTabsHintDirection(remainingRight <= 8 ? 'left' : 'right');
              }}
              scrollEventThrottle={16}
            >
              {tabItems.map((tab) => {
                const isActive = tab.key === activeTab;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={styles.tabButton}
                    activeOpacity={0.85}
                    onPress={() => setActiveTab(tab.key)}
                  >
                    <Text
                      style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {toTurkishUppercase(tab.label)}
                    </Text>
                    <View style={[styles.tabUnderline, isActive && styles.tabUnderlineActive]} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View
              pointerEvents="none"
              style={[styles.tabsScrollHint, tabsHintDirection === 'left' ? styles.tabsScrollHintLeft : styles.tabsScrollHintRight]}
            >
              <Ionicons
                name={tabsHintDirection === 'left' ? 'chevron-back' : 'chevron-forward'}
                size={14}
                color={Colors.onSurfaceVariant}
              />
            </View>
            <Animated.View
              key={`tab-content-${activeTab}`}
              entering={FadeInDown.duration(220)}
              exiting={FadeOutUp.duration(160)}
              style={styles.tabAnimatedWrap}
            >
              {renderTabContent(product)}
            </Animated.View>
          </View>

          {hasDisplayValue(currentLocationText(product)) || hasDisplayValue(resolvePrimaryProductionSeason(product, t)) ? (
            <View style={styles.metaCardsWrap}>
              {hasDisplayValue(currentLocationText(product)) ? (
                <View style={styles.metaCard}>
                  <View style={styles.metaIconBadge}>
                    <Ionicons name="location-outline" size={15} color={Colors.secondary} />
                  </View>
                  <View>
                    <Text style={styles.metaTitle}>{toTurkishUppercase(t('product.metaProductionPlace'))}</Text>
                    <Text style={styles.metaValue}>
                      {currentLocationText(product)}
                    </Text>
                  </View>
                </View>
              ) : null}
              {hasDisplayValue(resolvePrimaryProductionSeason(product, t)) ? (
                <View style={styles.metaCard}>
                  <View style={styles.metaIconBadge}>
                    <Ionicons name="calendar-outline" size={15} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.metaTitle}>{toTurkishUppercase(t('product.metaProductionSeason'))}</Text>
                    <Text style={styles.metaValue}>
                      {resolvePrimaryProductionSeason(product, t)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.reviewInfoCard}
            activeOpacity={hasRatingAndReviews ? 0.9 : 1}
            onPress={() => {
              if (!hasRatingAndReviews) return;
              setReviewModalVisible(true);
            }}
          >
            <Text style={styles.reviewInfoTitle}>{t('product.ratingAndReviewsTitle')}</Text>
            {hasRatingAndReviews ? (
              <>
                <Text style={styles.reviewScoreText}>{reviewRatingText}</Text>
                <View style={styles.reviewStarsRow}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Ionicons
                      key={`rating-star-${index}`}
                      name={normalizedRating !== null && index < Math.floor(normalizedRating) ? 'star' : 'star-outline'}
                      size={16}
                      color={Colors.accent}
                    />
                  ))}
                </View>
                <View style={styles.reviewInfoRow}>
                  <Text style={styles.reviewInfoLabel}>{t('product.reviewsLabel')}</Text>
                  <Text style={styles.reviewInfoValue}>{t('product.reviewsCountShort', { count: reviewCount })}</Text>
                </View>
                <View style={styles.reviewInfoRow}>
                  <Text style={styles.reviewInfoLabel}>{t('product.latestCommentsLabel')}</Text>
                  <Text style={styles.reviewInfoValue}>{activeComment}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.reviewEmptySummaryText}>{t('product.noRatingAndReviews')}</Text>
            )}
          </TouchableOpacity>

          {product.sellerId ? (
            <TouchableOpacity
              style={styles.sellerInfoCard}
              activeOpacity={0.9}
              onPress={() => router.push(`/seller/${product.sellerId}` as never)}
            >
              <View style={styles.sellerInfoIconWrap}>
                <Ionicons name="person-circle-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.sellerInfoTextWrap}>
                <Text style={styles.sellerInfoLabel}>{t('product.seller')}</Text>
                <Text style={styles.sellerInfoName} numberOfLines={1}>
                  {product.sellerName || t('product.unknownSeller')}
                </Text>
              </View>
              <View style={styles.sellerInfoCtaWrap}>
                <Text style={styles.sellerInfoCtaText}>{t('product.viewSellerProfile')}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          ) : null}

          {recommendedProducts.length > 0 ? (
            <View style={styles.recommendedSection}>
              <SectionHeader
                title={t('product.recommendedProducts', { defaultValue: t('home.recentlyViewed') })}
                seeAllLabel={t('home.seeAll')}
                onSeeAll={() => router.push('/(tabs)/categories')}
              />
              <View style={styles.recommendedGrid}>
                {recommendedProducts.map((item) => (
                  <View key={`recommended-${item.id}`} style={styles.recommendedGridItem}>
                    <ProductCard item={item} variant="grid" onPress={() => router.push(`/product/${item.id}`)} />
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.reviewModalOverlay}>
          <View style={styles.reviewModalCard}>
            <View style={styles.reviewModalHeader}>
              <Text style={styles.reviewModalTitle}>{t('product.ratingAndReviewsTitle')}</Text>
              <TouchableOpacity
                style={styles.reviewModalCloseButton}
                activeOpacity={0.8}
                onPress={() => setReviewModalVisible(false)}
              >
                <Ionicons name="close" size={18} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {sortedReviews.length > 0 ? sortedReviews.map((item, index) => (
                <View key={item.id ?? `${item.comment}-${index}`} style={styles.reviewModalItem}>
                  <View style={styles.reviewModalStarsRow}>
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Ionicons
                        key={`modal-star-${index}-${starIndex}`}
                        name={starIndex < Math.floor(Math.max(0, Math.min(5, item.rating))) ? 'star' : 'star-outline'}
                        size={14}
                        color={Colors.accent}
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewModalComment}>{item.comment}</Text>
                </View>
              )) : (
                <Text style={styles.reviewModalEmpty}>{t('product.noReviewComment')}</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={badgeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBadgeModalVisible(false)}
      >
        <View style={styles.reviewModalOverlay}>
          <View style={styles.reviewModalCard}>
            <View style={styles.reviewModalHeader}>
              <Text style={styles.reviewModalTitle}>{selectedBadge?.title || t('product.logoInfoTitle')}</Text>
              <TouchableOpacity
                style={styles.reviewModalCloseButton}
                activeOpacity={0.8}
                onPress={() => setBadgeModalVisible(false)}
              >
                <Ionicons name="close" size={18} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            {selectedBadge ? (
              <View style={styles.badgeInfoBody}>
                <Image source={selectedBadge.source} style={styles.badgeInfoImage} resizeMode="contain" />
                <Text style={styles.badgeInfoDescription}>{selectedBadge.description}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>



      {product.listingType !== ListingType.AUCTION && (
        <Animated.View
          pointerEvents={showStickyAddToCart ? 'auto' : 'none'}
          style={[styles.stickyCartCtaWrap, stickyCtaAnimatedStyle]}
        >
          <View style={styles.stickyCartCtaRow}>
            <TouchableOpacity
              style={styles.stickyCartUtilityButton}
              activeOpacity={0.85}
              onPress={() => showToast({ message: t('common.comingSoon', { defaultValue: 'Yakında' }), type: 'info' })}
            >
              <Ionicons name="share-outline" size={18} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stickyCartUtilityButton}
              activeOpacity={0.85}
              onPress={handleToggleFavorite}
            >
              <Ionicons
                name={favoriteActive ? 'heart' : 'heart-outline'}
                size={18}
                color={favoriteActive ? Colors.accent : Colors.onSurfaceVariant}
              />
            </TouchableOpacity>
            {isAskPrice ? (
              <TouchableOpacity style={styles.stickyCartCtaButton} activeOpacity={0.85} onPress={handleAskPrice}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.white} />
                <Text style={styles.stickyCartCtaText}>{t('product.askPrice')}</Text>
              </TouchableOpacity>
            ) : cartQuantity > 0 ? (
              <View style={styles.stickyQuantityStepper}>
                <TouchableOpacity style={styles.stickyQuantityButton} activeOpacity={0.85} onPress={handleDecreaseQuantity}>
                  <Ionicons name="remove" size={16} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.stickyQuantityValue}>{`${cartQuantity} ${cartUnitLabel} ${t('product.inCartSuffix')}`}</Text>
                <TouchableOpacity style={styles.stickyQuantityButton} activeOpacity={0.85} onPress={handleIncreaseQuantity}>
                  <Ionicons name="add" size={16} color={Colors.white} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.stickyCartCtaButton} activeOpacity={0.85} onPress={handleAddToCart}>
                <Ionicons name="cart-outline" size={16} color={Colors.white} />
                <Text style={styles.stickyCartCtaText}>{t('product.addToCart')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function currentLocationText(
  product: NonNullable<ReturnType<typeof useProduct>['data']>,
) {
  if (product.productionProvince && product.productionDistrict) {
    return `${product.productionProvince}, ${product.productionDistrict}`;
  }
  if (product.productionProvince) {
    return product.productionProvince;
  }
  if (product.productionDistrict) {
    return product.productionDistrict;
  }
  return '';
}

function toTurkishUppercase(value: string): string {
  return value.toLocaleUpperCase('tr-TR');
}

function extractVariantOptions(
  product: NonNullable<ReturnType<typeof useProduct>['data']>,
): ProductVariantOption[] {
  const productRecord = product as unknown as Record<string, unknown>;
  const candidateSources: unknown[] = [
    product.variantOptions,
    productRecord.variants,
    productRecord.variantNumbers,
  ];

  const firstArray = candidateSources.find((source) => Array.isArray(source));
  if (!Array.isArray(firstArray)) {
    const optionsFromSkus = buildVariantOptionsFromSkus(extractVariantSkus(product));
    return optionsFromSkus;
  }

  const parsed = firstArray
    .map((item, index) => normalizeVariantOption(item, index))
    .filter((item): item is ProductVariantOption => Boolean(item));

  const unique = new Map<string, ProductVariantOption>();
  parsed.forEach((item) => {
    if (!unique.has(item.id)) {
      unique.set(item.id, item);
    }
  });
  return [...unique.values()];
}

function extractVariantSkus(
  product: NonNullable<ReturnType<typeof useProduct>['data']>,
): ProductVariantSku[] {
  if (!Array.isArray(product.variantSkus)) return [];
  return product.variantSkus
    .map((item) => normalizeVariantSku(item))
    .filter((item): item is ProductVariantSku => Boolean(item));
}

function normalizeVariantSku(item: unknown): ProductVariantSku | null {
  if (!item || typeof item !== 'object') return null;
  const record = item as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  if (!id) return null;

  return {
    id,
    colorVariantNumberId: typeof record.colorVariantNumberId === 'string' ? record.colorVariantNumberId : null,
    sizeVariantNumberId: typeof record.sizeVariantNumberId === 'string' ? record.sizeVariantNumberId : null,
    colorVariant: normalizeSkuVariantNode(record.colorVariant),
    sizeVariant: normalizeSkuVariantNode(record.sizeVariant),
    skuCode: typeof record.skuCode === 'string' ? record.skuCode : null,
    stockQuantity: typeof record.stockQuantity === 'number' ? record.stockQuantity : 0,
    priceOverride: typeof record.priceOverride === 'number' ? record.priceOverride : null,
    imageUrl: typeof record.imageUrl === 'string' ? record.imageUrl : null,
    isActive: typeof record.isActive === 'boolean' ? record.isActive : true,
  };
}

function buildVariantOptionsFromSkus(skus: ProductVariantSku[]): ProductVariantOption[] {
  const optionMap = new Map<string, ProductVariantOption>();
  skus.forEach((sku) => {
    const stock = typeof sku.stockQuantity === 'number' ? sku.stockQuantity : 0;
    const pairs = [
      {
        id: sku.colorVariantNumberId,
        node: sku.colorVariant,
        kind: 'COLOR' as ProductVariantKind,
      },
      {
        id: sku.sizeVariantNumberId,
        node: sku.sizeVariant,
        kind: 'SIZE' as ProductVariantKind,
      },
    ];
    pairs.forEach((item) => {
      if (!item.id || !item.node) return;
      const existing = optionMap.get(item.id);
      const label = item.node.nameTr?.trim() || item.node.nameEn?.trim() || '';
      if (!label) return;
      const nextStock = (existing?.stockQuantity ?? 0) + Math.max(0, stock);
      optionMap.set(item.id, {
        id: item.id,
        label,
        kind: normalizeVariantKind(item.node.kind ?? item.kind),
        swatchHex: item.node.swatchHex ?? null,
        imageUrl: existing?.imageUrl ?? sku.imageUrl ?? null,
        inStock: (existing?.inStock ?? false) || stock > 0,
        stockQuantity: nextStock,
      });
    });
  });

  return [...optionMap.values()].sort((left, right) => {
    if (left.kind === right.kind) return left.label.localeCompare(right.label, 'tr');
    if (left.kind === 'COLOR') return -1;
    if (right.kind === 'COLOR') return 1;
    return left.label.localeCompare(right.label, 'tr');
  });
}

function normalizeSkuVariantNode(
  value: unknown,
): ProductVariantSku['colorVariant'] {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : '';
  if (!id) return null;
  return {
    id,
    kind: typeof record.kind === 'string' ? normalizeVariantKind(record.kind) : undefined,
    nameTr: typeof record.nameTr === 'string' ? record.nameTr : null,
    nameEn: typeof record.nameEn === 'string' ? record.nameEn : null,
    swatchHex: typeof record.swatchHex === 'string' ? record.swatchHex : null,
  };
}

function resolveSelectedVariantSku(
  skus: ProductVariantSku[],
  selectedColorVariantId: string | null,
  selectedSizeVariantId: string | null,
): ProductVariantSku | null {
  if (skus.length === 0) return null;
  const active = skus.filter((item) => item.isActive !== false);
  const hasColorSelection = Boolean(selectedColorVariantId);
  const hasSizeSelection = Boolean(selectedSizeVariantId);

  const preferred = active.find(
    (item) =>
      (item.colorVariantNumberId ?? null) === (selectedColorVariantId ?? null)
      && (item.sizeVariantNumberId ?? null) === (selectedSizeVariantId ?? null),
  );
  if (preferred) return preferred;

  if (hasColorSelection && hasSizeSelection) {
    return null;
  }

  if (selectedColorVariantId) {
    const fallbackByColor = active.find(
      (item) => (item.colorVariantNumberId ?? null) === selectedColorVariantId,
    );
    if (fallbackByColor) return fallbackByColor;
  }

  if (selectedSizeVariantId) {
    const fallbackBySize = active.find(
      (item) => (item.sizeVariantNumberId ?? null) === selectedSizeVariantId,
    );
    if (fallbackBySize) return fallbackBySize;
  }

  return active[0] ?? null;
}

function normalizeVariantOption(item: unknown, index: number): ProductVariantOption | null {
  if (!item || typeof item !== 'object') return null;
  const record = item as Record<string, unknown>;
  const label = typeof record.label === 'string'
    ? record.label
    : typeof record.name === 'string'
      ? record.name
      : typeof record.nameTr === 'string'
        ? record.nameTr
        : '';
  if (!label.trim()) return null;

  const normalizedKind = normalizeVariantKind(record.kind);
  const id = typeof record.id === 'string' && record.id.trim().length > 0
    ? record.id
    : `${normalizedKind}-${label}-${index}`;

  return {
    id,
    label: label.trim(),
    kind: normalizedKind,
    swatchHex: typeof record.swatchHex === 'string' ? record.swatchHex : null,
    imageUrl: typeof record.imageUrl === 'string' ? record.imageUrl : null,
    inStock: typeof record.inStock === 'boolean' ? record.inStock : undefined,
    stockQuantity: typeof record.stockQuantity === 'number' ? record.stockQuantity : null,
  };
}

function normalizeVariantKind(value: unknown): ProductVariantKind {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (raw === 'COLOR') return 'COLOR';
  if (raw === 'SIZE') return 'SIZE';
  if (raw === 'NUMBER') return 'NUMBER';
  if (raw === 'OPTION') return 'OPTION';
  return 'VARIATION';
}

function hasDisplayValue(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return Boolean(value);
}

function formatOptionalPrice(value: number | null | undefined): string {
  if (!hasDisplayValue(value)) return '';
  return formatCurrency(value);
}

function formatStringArray(value: string[] | null | undefined): string {
  if (!Array.isArray(value) || value.length === 0) return '';
  const normalized = value.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  return normalized.join(', ');
}

function formatSalesMonths(value: number[] | null | undefined): string {
  if (!Array.isArray(value) || value.length === 0) return '';
  return value.join(', ');
}

function formatNumberValue(value: number | null | undefined): string {
  if (!hasDisplayValue(value)) return '';
  return String(value);
}

function formatProductionSeasons(
  product: NonNullable<ReturnType<typeof useProduct>['data']>,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (Array.isArray(product.productionSeasons) && product.productionSeasons.length > 0) {
    return product.productionSeasons.map((season) => t(`listing.productionSeasons.${season}`)).join(', ');
  }
  if (product.productionSeason) {
    return t(`listing.productionSeasons.${product.productionSeason}`);
  }
  return '';
}

function resolvePrimaryProductionSeason(
  product: NonNullable<ReturnType<typeof useProduct>['data']>,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (product.productionSeason) {
    return t(`listing.productionSeasons.${product.productionSeason}`);
  }
  if (Array.isArray(product.productionSeasons) && product.productionSeasons.length > 0) {
    return t(`listing.productionSeasons.${product.productionSeasons[0]}`);
  }
  return '';
}

function resolveProductUnitLabel(
  product: NonNullable<ReturnType<typeof useProduct>['data']>,
  t: ReturnType<typeof useTranslation>['t'],
) {
  const normalized = `${product.title ?? ''} ${product.productContent ?? ''}`.toLowerCase();

  if (/\bkg\b|kilogram/.test(normalized)) return 'kg';
  if (/\blt\b|litre|liter/.test(normalized)) return 'lt';
  if (/\bgr\b|\bg\b|gram/.test(normalized)) return 'g';

  return t('product.unitPiece');
}

function collectHeroBadgeItems(
  product: NonNullable<ReturnType<typeof useProduct>['data']>,
  t: ReturnType<typeof useTranslation>['t'],
) {
  const items: HeroBadgeItem[] = [];
  const resolvedGeoTypes = product.geoIndicationTypes?.length
    ? product.geoIndicationTypes
    : product.geoIndicationType
      ? [product.geoIndicationType]
      : [];

  resolvedGeoTypes.slice(0, 3).forEach((type) => {
    const source = GEO_BADGE_LOGOS[type];
    if (!source) return;
    items.push({
      id: `geo-${type}`,
      source: source as ImageSourcePropType,
      title: t(`product.logo.${String(type).toLowerCase()}.title`),
      description: t(`product.logo.${String(type).toLowerCase()}.description`),
    });
  });

  const tokenSet = new Set<string>();

  if (resolvedGeoTypes.length > 0) {
    tokenSet.add('geo_indication');
    resolvedGeoTypes.forEach((type) => tokenSet.add(String(type).toLowerCase()));
  }

  if (typeof product.trustBadge === 'string') {
    tokenSet.add(product.trustBadge.toLowerCase());
  } else if (product.trustBadge && typeof product.trustBadge === 'object' && product.trustBadge.level) {
    tokenSet.add(String(product.trustBadge.level).toLowerCase());
  }

  (product.trustBadges || []).forEach((badge) => tokenSet.add(String(badge).toLowerCase()));

  if (product.additionalCertificates) {
    product.additionalCertificates
      .split(/[,;|]/)
      .map((part) => part.trim().toLowerCase().replace(/\s+/g, '_'))
      .filter(Boolean)
      .forEach((token) => tokenSet.add(token));
  }

  Array.from(tokenSet).forEach((token) => {
    const uri = PRODUCT_BADGE_IMAGE_BY_TOKEN[token];
    if (!uri) return;
    if (items.some((item) => item.id === `token-${token}`)) return;
    items.push({
      id: `token-${token}`,
      source: { uri },
      title: t(`product.logo.${token}.title`, { defaultValue: t('product.logo.defaultTitle') }),
      description: t(`product.logo.${token}.description`, { defaultValue: t('product.logo.defaultDescription') }),
    });
  });

  return items.slice(0, 6);
}

function resolveGeoIndicationName(product: NonNullable<ReturnType<typeof useProduct>['data']>) {
  const resolvedGeoTypes = product.geoIndicationTypes?.length
    ? product.geoIndicationTypes
    : product.geoIndicationType
      ? [product.geoIndicationType]
      : [];

  const primaryType = resolvedGeoTypes[0];
  if (product.geoIndicationCertNo && primaryType) {
    return `${product.geoIndicationCertNo} (${primaryType})`;
  }
  if (product.geoIndicationCertNo) {
    return product.geoIndicationCertNo;
  }
  if (primaryType) {
    return String(primaryType);
  }
  return null;
}

function resolveProductReviews(product: NonNullable<ReturnType<typeof useProduct>['data']>) {
  if (product.reviews && product.reviews.length > 0) {
    return product.reviews;
  }
  if (product.latestReviewComment?.trim()) {
    return [
      {
        rating: Number.isFinite(product.rating) ? Math.max(0, Math.min(5, Number(product.rating))) : 0,
        comment: product.latestReviewComment.trim(),
        createdAt: product.createdAt,
      },
    ];
  }
  return [];
}

function getReviewTime(createdAt?: string) {
  if (!createdAt) return 0;
  const parsed = new Date(createdAt).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
