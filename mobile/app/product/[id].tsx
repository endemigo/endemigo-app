import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useProduct } from '../../hooks/useProducts';
import { Colors } from '../../constants/theme';
import { styles } from './[id].styles';
import { getProductImageUri } from '../../utils/productImages';
import { useCartStore } from '../../store/cartStore';
import { AskPriceModal } from '../../components/negotiation';
import { useStartNegotiation } from '../../hooks/useNegotiations';
import { useModalStore } from '../../store/modalStore';
import { useToastStore } from '../../store/toastStore';

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x300/F8F9FA/0097D8?text=Endemigo';

/* ─── Product Hero Image Section ─────────────────────────────── */
function ProductHero({
  productImageUri,
  onBack,
  onShare,
  categoryName,
  t,
}: {
  productImageUri: string;
  onBack: () => void;
  onShare: () => void;
  categoryName?: string;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  return (
    <View style={styles.heroImageContainer}>
      <Image source={{ uri: productImageUri }} style={styles.heroImage} resizeMode="cover" />
      <View style={styles.heroGradientOverlay} />

      <TouchableOpacity style={styles.heroBackButton} onPress={onBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.heroShareButton} onPress={onShare} activeOpacity={0.8}>
        <Ionicons name="share-outline" size={22} color={Colors.onSurface} />
      </TouchableOpacity>

      <View style={styles.heroBadgeRow}>
        {categoryName ? (
          <View style={styles.heroCategoryBadge}>
            <Text style={styles.heroCategoryText}>{categoryName}</Text>
          </View>
        ) : null}
        <View style={styles.heroTrustBadge}>
          <Ionicons name="shield-checkmark" size={14} color={Colors.secondary} />
          <Text style={styles.heroTrustText}>{t('product.premiumQuality')}</Text>
        </View>
      </View>
    </View>
  );
}

/* ─── Price Row ──────────────────────────────────────────────── */
function PriceSection({
  isAskPrice,
  price,
  t,
}: {
  isAskPrice: boolean;
  price: number;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  return (
    <View style={styles.priceRow}>
      {isAskPrice ? (
        <View style={styles.askPriceHeroBadge}>
          <Ionicons name="chatbubble-ellipses" size={16} color={Colors.primary} />
          <Text style={styles.askPriceHeroText}>{t('product.askPrice')}</Text>
        </View>
      ) : (
        <Text style={styles.price}>₺{Number(price).toLocaleString('tr-TR')}</Text>
      )}
      <View style={styles.secureTradeChip}>
        <Ionicons name="checkmark-circle" size={14} color={Colors.secondary} />
        <Text style={styles.secureTradeText}>{t('product.secureTrade')}</Text>
      </View>
    </View>
  );
}

/* ─── Seller Card ────────────────────────────────────────────── */
function SellerCard({
  sellerId,
  sellerName,
  t,
  onPress,
}: {
  sellerId?: string;
  sellerName: string;
  t: ReturnType<typeof useTranslation>['t'];
  onPress?: () => void;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={styles.sellerCard}
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.sellerAvatar}>
        <Ionicons name="storefront" size={22} color={Colors.primary} />
      </View>
      <View style={styles.sellerInfo}>
        <Text style={styles.sellerLabel}>{t('product.seller')}</Text>
        <Text style={styles.sellerName}>{sellerName || t('product.unknownSeller')}</Text>
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
      ) : null}
    </Wrapper>
  );
}

/* ─── Description Section ──────────────────────────────────────── */
function DescriptionSection({
  description,
  t,
}: {
  description: string;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.sectionTitle}>{t('product.descriptionTitle')}</Text>
      <View style={styles.descriptionCard}>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

/* ─── Info Grid ──────────────────────────────────────────────── */
function InfoGrid({ t }: { t: ReturnType<typeof useTranslation>['t'] }) {
  const items = [
    {
      icon: 'flash' as const,
      color: Colors.accent,
      title: t('home.trustFast'),
      sub: t('home.trustFastSub'),
    },
    {
      icon: 'card' as const,
      color: Colors.primary,
      title: t('home.securePayment'),
      sub: t('product.securePayment'),
    },
  ];

  return (
    <View style={styles.infoGrid}>
      {items.map((item) => (
        <View key={item.title} style={styles.infoCard}>
          <View style={styles.infoIconWrap}>
            <Ionicons name={item.icon} size={16} color={item.color} />
          </View>
          <Text style={styles.infoTitle}>{item.title}</Text>
          <Text style={styles.infoSub}>{item.sub}</Text>
        </View>
      ))}
    </View>
  );
}

/* ─── Trust Badges Row ────────────────────────────────────────── */
function TrustBadges({ t }: { t: ReturnType<typeof useTranslation>['t'] }) {
  const badges = [
    { icon: 'shield-checkmark' as const, color: Colors.secondary, text: t('product.trust_original') },
    { icon: 'flash' as const, color: Colors.accent, text: t('product.trust_shipping') },
    { icon: 'return-down-back' as const, color: Colors.primary, text: t('product.trust_return') },
  ];

  return (
    <View style={styles.trustRow}>
      {badges.map((b) => (
        <View key={b.text} style={styles.trustBadge}>
          <Ionicons name={b.icon} size={16} color={b.color} />
          <Text style={styles.trustText}>{b.text}</Text>
        </View>
      ))}
    </View>
  );
}

/* ─── Bottom Action Bar ──────────────────────────────────────── */
function BottomActionBar({
  isAskPrice,
  price,
  t,
  onAddToCart,
  onAskPrice,
}: {
  isAskPrice: boolean;
  price: number;
  t: ReturnType<typeof useTranslation>['t'];
  onAddToCart: () => void;
  onAskPrice: () => void;
}) {
  return (
    <View style={styles.bottomBar}>
      <View style={styles.bottomPrice}>
        <Text style={styles.bottomPriceLabel}>{t('product.priceLabel')}</Text>
        {isAskPrice ? (
          <Text style={styles.bottomAskPriceValue}>{t('product.askPrice')}</Text>
        ) : (
          <Text style={styles.bottomPriceValue}>₺{Number(price).toLocaleString('tr-TR')}</Text>
        )}
      </View>

      <TouchableOpacity
        style={isAskPrice ? styles.askPriceButton : styles.addToCartButton}
        activeOpacity={0.8}
        onPress={isAskPrice ? onAskPrice : onAddToCart}
      >
        <Ionicons name={isAskPrice ? 'chatbubble-ellipses' : 'cart'} size={20} color={Colors.white} />
        <Text style={styles.bottomButtonText}>
          {isAskPrice ? t('product.askPrice') : t('product.addToCart')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ─── Product Detail Screen ──────────────────────────────────── */
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { data: product, isLoading } = useProduct(id);
  const addItem = useCartStore((state) => state.addItem);
  const showModal = useModalStore((state) => state.showModal);
  const showToast = useToastStore((state) => state.showToast);
  const startNegotiation = useStartNegotiation();
  const [askPriceVisible, setAskPriceVisible] = React.useState(false);

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
  const isAskPrice = Boolean(product.askPriceEnabled);

  const handleAskPriceSubmit = (input: {
    productId: string;
    amount: number;
    quantity: number;
    note?: string;
  }) => {
    startNegotiation.mutate(input, {
      onSuccess: (negotiation) => {
        setAskPriceVisible(false);
        router.push(`/negotiation/${negotiation.id}` as never);
      },
      onError: () => {
        showModal({
          title: t('common.error'),
          message: t('negotiation.askPrice.error'),
          type: 'error',
        });
      },
    });
  };

  const handlePolicyViolation = () => {
    showModal({
      title: t('negotiation.policy.title'),
      message: t('negotiation.policy.message'),
      type: 'error',
    });
  };

  const handleAddToCart = async () => {
    try {
      await addItem({
        productId: product.id,
        title: product.title,
        price: Number(product.price),
        imageUrl: productImageUri,
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

  const handleShare = () => {
    // Future: deep-link share logic
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollView}>
        <ProductHero
          productImageUri={productImageUri}
          onBack={() => router.back()}
          onShare={handleShare}
          categoryName={product.categoryName}
          t={t}
        />

        <View style={styles.content}>
          <Text style={styles.title}>{product.title}</Text>

          <PriceSection isAskPrice={isAskPrice} price={Number(product.price)} t={t} />

          <SellerCard
            sellerId={product.sellerId}
            sellerName={product.sellerName}
            t={t}
            onPress={product.sellerId ? () => router.push(`/seller/${product.sellerId}` as never) : undefined}
          />

          {product.description ? (
            <DescriptionSection description={product.description} t={t} />
          ) : null}

          <InfoGrid t={t} />
          <TrustBadges t={t} />
        </View>
      </ScrollView>

      <BottomActionBar
        isAskPrice={isAskPrice}
        price={Number(product.price)}
        t={t}
        onAddToCart={handleAddToCart}
        onAskPrice={() => setAskPriceVisible(true)}
      />

      <AskPriceModal
        product={product}
        visible={askPriceVisible}
        isPending={startNegotiation.isPending}
        onClose={() => setAskPriceVisible(false)}
        onSubmit={handleAskPriceSubmit}
        onPolicyViolation={handlePolicyViolation}
      />
    </View>
  );
}
