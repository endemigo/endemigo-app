import { StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  loadingText: {
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.md,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodyMedium,
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
    textAlign: 'center',
  },

  // Header
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerLogo: {
    width: 108,
    height: 24,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerActionButton: {
    minWidth: 44,
    height: 40,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: `${Colors.primary}1F`,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    fontSize: FontSize.subheading,
    color: Colors.onSurface,
    marginTop: Spacing.xs,
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 132,
  },
  // Etkinlik satırları kendi yatay marjlarını yönetir (bölüm başlıkları dahil).
  eventListContent: {
    paddingBottom: 132,
    paddingTop: Spacing.xs,
  },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.slate100,
    height: 128,
    ...Shadows.sm,
  },
  cardImage: {
    width: 112,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceContainerLow,
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.white,
  },
  liveText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },

  // Card Body
  cardBody: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: FontSize.body,
    color: Colors.onSurface,
    flex: 1,
  },
  timer: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.onSurfaceVariant,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },
  price: {
    color: Colors.auctionGreen,
    fontSize: FontSize.body,
    fontFamily: FontFamily.price,
    fontWeight: '400',
  },
  bidButton: {
    backgroundColor: Colors.auctionGreen,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    ...Shadows.colored(Colors.auctionGreen),
  },
  bidButtonText: {
    color: Colors.white,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.md,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  reserveBadge: {
    flexShrink: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.md,
  },
  reserveBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  bidCount: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },

  // Segment Selector
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.xl,
    padding: 4,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  segmentButtonActive: {
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  segmentButtonText: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.slate500,
  },
  segmentButtonTextActive: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.onSurface,
  },

  // Event Card
  eventCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  eventCover: {
    height: 140,
    width: '100%',
    position: 'relative',
    backgroundColor: Colors.surfaceContainerLow,
  },
  eventBadge: {
    position: 'absolute',
    top: Spacing.base,
    left: Spacing.base,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  eventBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  eventInfo: {
    padding: Spacing.base,
  },
  eventTitle: {
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  eventDescription: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.md,
  },
  eventMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.slate50,
    paddingTop: Spacing.sm,
  },
  eventMetaText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.slate500,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Search Input Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderColor: Colors.slate200,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.base,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 44,
    ...Shadows.sm,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.body,
    color: Colors.onSurface,
  },
  clearButton: {
    padding: 4,
  },

  // Filters Wrapper
  filtersWrapper: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
  },

  // Category Filter Chips
  categoriesContainer: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Shadows.colored(Colors.primary),
  },
  categoryChipText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.slate600,
  },
  categoryChipTextActive: {
    color: Colors.white,
  },

  // Status Filter Chips
  statusContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
    gap: Spacing.sm,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate100,
    gap: Spacing.xs,
  },
  statusChipActive: {
    backgroundColor: Colors.slate900,
    borderColor: Colors.slate900,
  },
  statusChipText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.slate500,
  },
  statusChipTextActive: {
    color: Colors.white,
    fontFamily: FontFamily.bodySemiBold,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Event Category Badge
  eventCategoryBadge: {
    position: 'absolute',
    bottom: Spacing.base,
    right: Spacing.base,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  eventCategoryBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodySemiBold,
  },

  // Dropdown Filter Styles
  dropdownsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dropdownSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderColor: Colors.slate200,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    height: 44,
  },
  dropdownSelectorText: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.slate500,
  },
  dropdownSelectorActiveText: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.primary,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
    paddingBottom: Spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  modalTitle: {
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.headline,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalList: {
    paddingVertical: Spacing.sm,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate50,
  },
  modalItemActive: {
    backgroundColor: `${Colors.primary}0A`,
  },
  modalItemText: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    color: Colors.slate700,
  },
  modalItemTextActive: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.primary,
  },

  // ─── Yeniden tasarım: chip filtre satırı ───────────────────
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  headerSearchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Canlı salon hero kartı ────────────────────────────────
  heroCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate100,
    overflow: 'hidden',
  },
  heroCover: {
    height: 130,
    backgroundColor: Colors.slate100,
  },
  heroLiveBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.lg,
  },
  heroLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.white,
  },
  heroLiveText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodySemiBold,
    letterSpacing: 0.5,
  },
  heroInfo: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  heroTitle: {
    fontSize: FontSize.bodyLg,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.onSurface,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  heroMetaText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    color: Colors.slate500,
  },
  heroCta: {
    marginTop: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  heroCtaText: {
    color: Colors.white,
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
  },

  // ─── Bölüm başlığı + kompakt yaklaşan kartı ───────────────
  sectionLabel: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.slate400,
    letterSpacing: 0.6,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  compactThumb: {
    width: 72,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.slate100,
  },
  compactBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  compactTitle: {
    fontSize: FontSize.meta,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.onSurface,
  },
  compactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  compactMetaText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    color: Colors.slate500,
  },
  compactCountdown: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.primary,
  },

  // ─── Geçmiş müzayede satırı ────────────────────────────────
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.slate50,
  },
  pastTitle: {
    flex: 1,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.slate500,
  },
  pastMeta: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },
});
