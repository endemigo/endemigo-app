import { StyleSheet, Platform } from 'react-native';
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
    gap: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodyMedium,
  },

  /* ─── Scroll Container ─────────────────────────────────────────── */
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },

  /* ─── Banner ───────────────────────────────────────────────────── */
  bannerContainer: {
    position: 'relative',
    height: 220,
    backgroundColor: Colors.surfaceContainerLow,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: `${Colors.black}59`,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    left: Spacing.lg,
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: `${Colors.white}EB`,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },

  /* ─── Profile Card ──────────────────────────────────────────────── */
  profileCard: {
    marginTop: -Spacing.xxl,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.base,
    borderWidth: 3,
    borderColor: Colors.primaryFixed,
  },
  sellerName: {
    fontSize: FontSize.title,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  sellerBio: {
    fontSize: FontSize.meta,
    fontFamily: FontFamily.body,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.base,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: FontSize.caption,
    color: Colors.slate500,
    marginLeft: 4,
    fontFamily: FontFamily.body,
  },
  noRatingReviewText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    color: Colors.slate500,
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: Colors.slate500,
  },

  /* ─── Stats Row ────────────────────────────────────────────────── */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: Spacing.base,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.base,
  },
  statValue: {
    fontSize: FontSize.heading,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    color: Colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.slate200,
    marginVertical: Spacing.sm,
  },

  /* ─── Trust Badges ─────────────────────────────────────────────── */
  trustRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginTop: Spacing.base,
    flexWrap: 'wrap',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  trustText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },

  /* ─── Products Section ─────────────────────────────────────────── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontSize: FontSize.titleSm,
    fontFamily: FontFamily.headline,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  sectionCount: {
    fontSize: FontSize.meta,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },

  /* ─── Product Card ──────────────────────────────────────────────── */
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  productCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  productImage: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.surfaceContainerLow,
  },
  productImageWrap: {
    position: 'relative',
  },
  geoBadgeLogosRow: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  geoBadgeLogo: {
    width: 28,
    height: 28,
  },
  productContent: {
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  productFooter: {
    marginTop: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productTitle: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurface,
    lineHeight: 20,
  },
  productPrice: {
    fontSize: FontSize.subheading,
    fontFamily: FontFamily.price,
    fontWeight: '400',
    color: Colors.primary,
  },
  quickActionButtonBase: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  quickActionButtonCart: {
    backgroundColor: Colors.primary,
  },
  quickActionButtonAskPrice: {
    backgroundColor: Colors.accent,
  },
  quickActionButtonAuction: {
    backgroundColor: Colors.auctionGreen,
  },

  /* ─── Empty State ──────────────────────────────────────────────── */
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    marginTop: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.slate400,
    marginTop: Spacing.base,
  },
  emptySub: {
    fontSize: FontSize.meta,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
