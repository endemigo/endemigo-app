import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { useModalStore } from '../store/modalStore';
import {
  useListingDrafts,
  useLocalListingDrafts,
  useInvalidateListingDrafts,
} from '../hooks/useListingDrafts';
import { deleteListingDraft, type ListingDraftSummary } from '../services/listingDraftService.ts';
import { deleteLocalListingDraft, isLocalDraftId } from '../services/localListingDraftService.ts';

export default function DraftsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isSeller = Boolean(user?.isSeller);
  const showModal = useModalStore((state) => state.showModal);
  const invalidateDrafts = useInvalidateListingDrafts();

  // Cihazdaki (misafir/onaysız) taslaklar herkese; backend taslakları yalnız satıcıya.
  const localQuery = useLocalListingDrafts(true);
  const backendQuery = useListingDrafts(isSeller);
  const drafts = [...(localQuery.data ?? []), ...(backendQuery.data ?? [])];
  const isLoading = localQuery.isLoading || (isSeller && backendQuery.isLoading);
  const isRefetching = localQuery.isRefetching || backendQuery.isRefetching;
  const hasLocalPending = (localQuery.data ?? []).length > 0 && !isSeller;

  const resumeDraft = (draft: ListingDraftSummary) => {
    router.push({
      pathname: '/(tabs)/become-seller',
      params: { draftId: draft.id, mode: draft.entryMode },
    } as never);
  };

  const confirmDelete = (draft: ListingDraftSummary) => {
    showModal({
      title: t('listing.deleteDraft'),
      message: t('listing.draftDeleteConfirm'),
      type: 'info',
      confirmText: t('listing.deleteDraft'),
      cancelText: t('common.cancel'),
      onConfirm: () => {
        const remove = isLocalDraftId(draft.id)
          ? deleteLocalListingDraft(draft.id)
          : deleteListingDraft(draft.id);
        remove
          .then(() => invalidateDrafts())
          .catch(() => {
            showModal({
              title: t('common.error'),
              message: t('listing.draftDeleteError'),
              type: 'error',
            });
          });
      },
    });
  };

  const draftTitle = (draft: ListingDraftSummary): string => {
    const title = draft.payload?.rawState?.title?.trim();
    return title && title.length > 0 ? title : t('listing.draftUntitled');
  };

  const renderItem = ({ item }: { item: ListingDraftSummary }) => (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardMain} activeOpacity={0.85} onPress={() => resumeDraft(item)}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={item.entryMode === 'AUCTION' ? 'hammer-outline' : 'storefront-outline'}
            size={20}
            color={Colors.primary}
          />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {draftTitle(item)}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.entryMode === 'AUCTION'
                  ? t('listing.draftAuctionBadge')
                  : t('listing.draftMarketplaceBadge')}
              </Text>
            </View>
            {item.isLocal ? (
              <View style={styles.localBadge}>
                <Ionicons name="phone-portrait-outline" size={11} color={Colors.secondary} />
                <Text style={styles.localBadgeText}>{t('listing.draftLocalBadge')}</Text>
              </View>
            ) : null}
            <Text style={styles.stepText}>{t('listing.draftStepLabel', { step: item.currentStep })}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.slate400} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        activeOpacity={0.82}
        onPress={() => confirmDelete(item)}
      >
        <Ionicons name="trash-outline" size={16} color={Colors.error} />
        <Text style={styles.deleteButtonText}>{t('listing.deleteDraft')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('listing.draftsTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {hasLocalPending ? (
        <View style={styles.pendingHint}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.secondary} />
          <Text style={styles.pendingHintText}>{t('listing.draftsLocalPendingHint')}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={drafts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="document-text-outline" size={40} color={Colors.slate300} />
              <Text style={styles.emptyTitle}>{t('listing.draftsEmpty')}</Text>
              <Text style={styles.emptyText}>{t('listing.draftsEmptyBody')}</Text>
            </View>
          }
          refreshing={isRefetching}
          onRefresh={() => {
            localQuery.refetch();
            if (isSeller) backendQuery.refetch();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.base,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.headlineBlack,
    fontSize: FontSize.subheading,
    color: Colors.onSurface,
  },
  headerSpacer: {
    width: 40,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    padding: Spacing.base,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryTintSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.body,
    color: Colors.onSurface,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  badge: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.slate200,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  stepText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: Colors.primary,
  },
  localBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${Colors.secondary}14`,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  localBadgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.secondary,
  },
  pendingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: `${Colors.secondary}0F`,
  },
  pendingHintText: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    paddingVertical: Spacing.sm,
  },
  deleteButtonText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.caption,
    color: Colors.error,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: Colors.onSurface,
    marginTop: Spacing.sm,
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
