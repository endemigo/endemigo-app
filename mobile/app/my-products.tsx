import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../constants/theme';
import { useMyProducts } from '../hooks/useProducts';
import { useMyPendingLots } from '../hooks/useProductEdit';
import { useApplyToEvent, type ApplyToEventInput } from '../hooks/useAuctions';
import { useAuthStore } from '../store/authStore';
import { useModalStore } from '../store/modalStore';
import { useRoleModeStore } from '../store/roleModeStore';
import { ProductStatus, type Product } from '../types';
import { resolveApiErrorMessage } from '../utils/apiError';
import { ApplyToEventSheet } from '../components/auction/ApplyToEventSheet';

export default function MyProductsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Seçici mod: dashboard'dan "Müzayedeye ürün ekle" ile açılır — kart tıklaması
  // düzenlemeye değil doğrudan müzayede sheet'ine gider (product-first).
  const { selectForAuction } = useLocalSearchParams<{ selectForAuction?: string }>();
  const selectorMode = selectForAuction === '1';
  const { user } = useAuthStore();
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const isSellerAccess = activeMode === 'seller' && Boolean(user?.isSeller);

  const productsQuery = useMyProducts(1, isSellerAccess);
  const pendingLotsQuery = useMyPendingLots(isSellerAccess);

  // productId → onay bekleyen lot (edit ekranına lotId taşımak + rozet için).
  const pendingLotByProduct = useMemo(() => {
    const map = new Map<string, string>();
    (pendingLotsQuery.data ?? []).forEach((lot) => {
      map.set(lot.productId, lot.id);
    });
    return map;
  }, [pendingLotsQuery.data]);

  const products = productsQuery.data?.items ?? [];

  const showModal = useModalStore((state) => state.showModal);
  const applyToEvent = useApplyToEvent();
  const [auctionProduct, setAuctionProduct] = useState<Product | null>(null);

  const openEdit = (product: Product) => {
    const lotId = pendingLotByProduct.get(product.id);
    router.push({
      pathname: '/product/edit/[id]',
      params: { id: product.id, ...(lotId ? { lotId } : {}) },
    });
  };

  const handleApplyToEvent = (input: ApplyToEventInput) => {
    applyToEvent.mutate(input, {
      onSuccess: () => {
        setAuctionProduct(null);
        // Lot DRAFT + PENDING açılır: "yayında" değil, onay bekliyor.
        showModal({
          type: 'success',
          title: t('applyToEvent.successTitle'),
          message: t('applyToEvent.successMessage'),
        });
      },
      onError: (error) => {
        showModal({
          type: 'error',
          title: t('common.error'),
          message: resolveApiErrorMessage(error, t, 'applyToEvent.errorFallback'),
        });
      },
    });
  };

  const renderItem = ({ item }: { item: Product }) => {
    const hasPendingLot = pendingLotByProduct.has(item.id);
    const underAuction = item.status === ProductStatus.UNDER_AUCTION;
    // ACTIVE_AUCTION_EXISTS + geçersiz durumları baştan ele: satıcı sheet'i
    // doldurup son adımda backend reddine toslamasın.
    const blockedStatus =
      item.status === ProductStatus.SOLD ||
      item.status === ProductStatus.ARCHIVED ||
      item.status === ProductStatus.SUSPENDED;
    const canAddToAuction = !hasPendingLot && !underAuction && !blockedStatus;
    // Seçici modda seçilemeyen ürünleri soluklaştır; tıklama no-op.
    const dimmed = selectorMode && !canAddToAuction;
    const onCardPress = () => {
      if (selectorMode) {
        if (canAddToAuction) setAuctionProduct(item);
        return;
      }
      openEdit(item);
    };
    const image = item.imageUrl || item.thumbnail;
    return (
      <View style={[styles.card, dimmed ? styles.cardDimmed : undefined]}>
        <TouchableOpacity
          style={styles.cardMain}
          activeOpacity={selectorMode && !canAddToAuction ? 1 : 0.85}
          onPress={onCardPress}
        >
          {image ? (
            <Image source={{ uri: image }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <Ionicons name="image-outline" size={22} color={Colors.slate400} />
            </View>
          )}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.badgeRow}>
              {item.status ? (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{t(`productStatuses.${item.status}`)}</Text>
                </View>
              ) : null}
              {hasPendingLot ? (
                <View style={styles.auctionBadge}>
                  <Ionicons name="hammer-outline" size={12} color={Colors.onTertiary} />
                  <Text style={styles.auctionBadgeText}>{t('myProducts.auctionPending')}</Text>
                </View>
              ) : underAuction ? (
                <View style={styles.auctionBadge}>
                  <Ionicons name="hammer-outline" size={12} color={Colors.onTertiary} />
                  <Text style={styles.auctionBadgeText}>{t('myProducts.underAuction')}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Ionicons
            name={selectorMode && canAddToAuction ? 'hammer-outline' : 'chevron-forward'}
            size={20}
            color={selectorMode && canAddToAuction ? Colors.primary : Colors.slate400}
          />
        </TouchableOpacity>

        {!selectorMode && canAddToAuction ? (
          <TouchableOpacity
            style={styles.auctionAction}
            activeOpacity={0.82}
            onPress={() => setAuctionProduct(item)}
          >
            <Ionicons name="hammer-outline" size={16} color={Colors.primary} />
            <Text style={styles.auctionActionText}>{t('myProducts.addToAuction')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const isLoading = productsQuery.isLoading || pendingLotsQuery.isLoading;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectorMode ? t('myProducts.selectForAuctionTitle') : t('myProducts.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {selectorMode && isSellerAccess ? (
        <View style={styles.selectorHint}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
          <Text style={styles.selectorHintText}>{t('myProducts.selectForAuctionHint')}</Text>
        </View>
      ) : null}

      {!isSellerAccess ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('myProducts.accessDenied')}</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="cube-outline" size={40} color={Colors.slate300} />
              <Text style={styles.emptyText}>{t('myProducts.empty')}</Text>
            </View>
          }
          refreshing={productsQuery.isRefetching}
          onRefresh={() => {
            productsQuery.refetch();
            pendingLotsQuery.refetch();
          }}
        />
      )}

      <ApplyToEventSheet
        product={auctionProduct}
        visible={!!auctionProduct}
        isPending={applyToEvent.isPending}
        onClose={() => setAuctionProduct(null)}
        onSubmit={handleApplyToEvent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.headlineBlack,
    fontSize: FontSize.subheading,
    color: Colors.onSurface,
  },
  headerSpacer: { width: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontFamily: FontFamily.body, fontSize: FontSize.body, color: Colors.slate500, textAlign: 'center' },
  listContent: { padding: Spacing.base, gap: Spacing.sm },
  selectorHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: `${Colors.primary}0F`,
  },
  selectorHintText: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: Colors.primary,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  cardDimmed: {
    opacity: 0.45,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  auctionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.primary}55`,
    backgroundColor: `${Colors.primary}0F`,
    paddingVertical: Spacing.sm,
  },
  auctionActionText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.caption,
    color: Colors.primary,
  },
  thumb: { width: 56, height: 56, borderRadius: BorderRadius.lg, backgroundColor: Colors.slate100 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: Spacing.xs },
  cardTitle: { fontFamily: FontFamily.headline, fontSize: FontSize.body, color: Colors.onSurface },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  statusBadge: {
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  statusBadgeText: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.slate600 },
  auctionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.tertiary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  auctionBadgeText: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.onTertiary },
});
