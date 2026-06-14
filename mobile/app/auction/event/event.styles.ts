import { StyleSheet, Dimensions } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../../constants/theme';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    backgroundColor: Colors.white,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
    ...Shadows.sm,
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  headerSubtitle: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },
  headerMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  metricText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.slate600,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.error,
  },

  // Main Scroll
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },

  // Active Lot Area
  activeLotContainer: {
    backgroundColor: Colors.white,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    overflow: 'hidden',
  },
  activeLotImageContainer: {
    position: 'relative',
    width: '100%',
    height: 240,
    backgroundColor: Colors.slate50,
    overflow: 'hidden',
  },
  activeLotImage: {
    width: '100%',
    height: '100%',
  },
  activeLotImageBadgeContainer: {
    position: 'absolute',
    top: Spacing.base,
    left: Spacing.base,
    right: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeLotBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  activeLotBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  activeLotNumberBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  activeLotNumberBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
  },
  activeLotInfo: {
    flex: 1,
  },
  activeLotTitle: {
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurface,
    marginBottom: 4,
  },
  activeLotPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },
  bidderNameSubtext: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    color: Colors.slate500,
    marginTop: 2,
  },
  priceValue: {
    fontSize: FontSize.title,
    fontFamily: FontFamily.price,
    fontWeight: '700',
    color: Colors.auctionGreen,
  },
  
  // Timer Area
  timerContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.slate50,
    padding: Spacing.sm,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  timerTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timerText: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.slate700,
  },
  countdownValue: {
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    color: Colors.error,
  },
  bidCountText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.slate500,
  },

  // Active Bid Info Card (Winner/Outbid etc.)
  statusAlertCard: {
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusAlertText: {
    flex: 1,
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.onSurface,
  },

  // Waiting State
  waitingContainer: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  waitingCover: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius['2xl'],
    marginBottom: Spacing.lg,
  },
  waitingTitle: {
    fontSize: FontSize.title,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  waitingTime: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.slate500,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },

  // Bottom Segmented Tab View
  subTabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    backgroundColor: Colors.white,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabButtonActive: {
    borderBottomColor: Colors.auctionGreen,
  },
  subTabText: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.slate500,
  },
  subTabTextActive: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.auctionGreen,
  },

  // Lot List (Catalog)
  lotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate50,
  },
  lotItemActive: {
    backgroundColor: `${Colors.auctionGreen}05`,
    borderLeftWidth: 3,
    borderLeftColor: Colors.auctionGreen,
  },
  lotSeqContainer: {
    width: 36,
    alignItems: 'center',
  },
  lotSeqText: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.slate400,
  },
  lotSeqTextActive: {
    color: Colors.auctionGreen,
  },
  lotThumb: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.base,
    backgroundColor: Colors.surfaceContainerLow,
  },
  lotDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  lotTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  lotItemTitle: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.onSurface,
    flex: 1,
    marginRight: Spacing.sm,
  },
  lotPrice: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.price,
    fontWeight: '600',
    color: Colors.slate600,
  },
  lotStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lotStatusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.md,
  },
  lotStatusText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
  },
  lotNumberText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },

  // Live Feed Tab
  feedContainer: {
    padding: Spacing.base,
    backgroundColor: Colors.white,
    minHeight: 200,
  },
  feedItem: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate50,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  feedIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedContent: {
    flex: 1,
  },
  feedTitle: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  feedBody: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    color: Colors.slate500,
    marginTop: 2,
  },
  feedEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  feedEmptyText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
    marginTop: Spacing.xs,
  },

  // Sticky Bottom Action bar
  stickyComposer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    flexDirection: 'row',
    gap: Spacing.base,
    ...Shadows.md,
  },
  openComposerButton: {
    flex: 1,
    backgroundColor: Colors.auctionGreen,
    height: 48,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.colored(Colors.auctionGreen),
  },
  openComposerButtonText: {
    color: Colors.white,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  withdrawButton: {
    backgroundColor: Colors.slate100,
    height: 48,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  withdrawButtonText: {
    color: Colors.error,
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
  },

  // Modals overlay (Premium Bottom Sheet styling)
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalBackgroundClose: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
    paddingBottom: Spacing.xl,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.slate200,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    paddingHorizontal: Spacing.base,
  },
  modalTitle: {
    fontSize: FontSize.titleSm,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.onSurface,
  },
  modalCloseButton: {
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 280,
    overflow: 'hidden',
    marginBottom: Spacing.base,
    backgroundColor: Colors.slate50,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imageBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  imageBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
  },
  previewTitle: {
    fontSize: FontSize.titleSm,
    fontFamily: FontFamily.bodyBold,
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  detailBadgeText: {
    fontSize: FontSize.caption,
    color: Colors.slate600,
    fontFamily: FontFamily.bodyMedium,
  },
  detailBadgePriceText: {
    fontSize: FontSize.caption,
    color: Colors.auctionGreen,
    fontFamily: FontFamily.bodyBold,
  },
  sectionHeader: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  descriptionText: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    color: Colors.slate700,
    lineHeight: 22,
    marginBottom: Spacing.base,
  },
  specGrid: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginTop: Spacing.xs,
  },
  specTile: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Colors.slate50,
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  specTileLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },
  specTileValue: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.slate800,
  },
  leaderBadge: {
    backgroundColor: Colors.auctionGreen,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.md,
    gap: 2,
    marginLeft: Spacing.xs,
  },
  leaderBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs - 2,
    fontFamily: FontFamily.bodyBold,
  },
});
