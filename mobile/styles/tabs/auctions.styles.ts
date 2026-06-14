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
});
