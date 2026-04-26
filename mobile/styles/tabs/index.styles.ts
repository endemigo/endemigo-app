const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 16) / 2;
const BANNER_WIDTH = SCREEN_WIDTH - 16 * 2;
const SQUARE_CARD = 148;
import { StyleSheet, Dimensions } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export const styles = StyleSheet.create({
  sectionMargin: { marginTop: 24 /* Spacing.xl */ },
  sectionMarginLarge: { marginTop: 32 /* Spacing.xxl */ },
  sectionMarginExtra: { marginTop: 40 /* xxl + md */ },
  bottomSpacer: { height: 100 },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.md,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodyMedium,
  },

  // ─── Top Header ───
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xxl * 2,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    ...Shadows.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  brandLogo: {
    height: 28,
    width: 130,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  notificationBadge: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Search Bar ───
  searchSection: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    height: 56,
    paddingHorizontal: Spacing.base,
    ...Shadows.md,
  },
  searchIcon: {
    marginRight: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.onSurface,
  },
  qrButton: {
    backgroundColor: `${Colors.primary}1A`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },

  // ─── Banner ───
  bannerSection: {
    marginBottom: Spacing.xl,
    paddingLeft: Spacing.base,
  },
  banner: {
    width: BANNER_WIDTH,
    height: 192,
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
    backgroundColor: Colors.primary,
    ...Shadows.lg,
  },
  bannerBgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.slate300,
  },
  dotActive: {
    width: 18,
    backgroundColor: Colors.primary,
  },
  bannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  bannerBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  bannerBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bannerTitle: {
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    fontSize: FontSize.titleLg,
    color: Colors.white,
    lineHeight: 30,
    marginBottom: Spacing.sm,
  },
  bannerSubtitle: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyMedium,
    color: `${Colors.white}CC`,
    maxWidth: 220,
  },

  // ─── Tiles ───
  tilesSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
    marginBottom: Spacing.xl,
  },
  tile: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius['4xl'],
    alignItems: 'center',
    borderWidth: 2,
  },
  shopTile: {
    backgroundColor: `${Colors.accent}1A`,
    borderColor: `${Colors.accent}1A`,
  },
  auctionTile: {
    backgroundColor: `${Colors.auctionGreen}1A`,
    borderColor: `${Colors.auctionGreen}1A`,
  },
  tileIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  tileTitle: {
    fontFamily: FontFamily.headline,
    fontWeight: '700',
    fontSize: FontSize.bodyXl,
    marginBottom: Spacing.xs,
  },
  tileSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: Spacing.base,
  },
  tileButton: {
    width: '100%',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  tileButtonText: {
    color: Colors.white,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },

  // ─── Section Header ───
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    fontSize: FontSize.subheading,
    color: Colors.onSurface,
  },
  seeAll: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    color: Colors.primary,
  },

  // ─── Categories ───
  categoriesScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  categoryItem: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  categoryName: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurface,
    textAlign: 'center',
  },

  // ─── Son Ziyaret Edilenler ───
  recentGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  recentCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  recentImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.surfaceContainerLow,
  },
  recentBody: {
    padding: Spacing.sm,
  },
  recentTitle: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.onSurface,
    lineHeight: 12,
    marginBottom: 4,
    height: 24,
  },
  recentPrice: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.headlineBlack,
    color: Colors.primary,
  },

  // ─── Trust Bar ───
  trustBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
    alignItems: 'center',
  },
  trustItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trustIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustTitle: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  trustSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },
  trustDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.slate100,
    marginHorizontal: Spacing.sm,
  },

  // ─── Product Grid ───
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
  },
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  productImageContainer: {
    aspectRatio: 1,
    width: '100%',
  },
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceContainerLow,
  },
  productBody: {
    padding: Spacing.md,
    flex: 1,
  },
  productTitle: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
    lineHeight: 16,
  },
  productCategory: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.body,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.sm,
  },
  productFooter: {
    marginTop: 'auto',
  },
  productPrice: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    color: Colors.primary,
  },

  // ─── Empty State ───
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
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
  },

  // ─── Editorial Banners ───
  editorialScroll: {
    paddingLeft: Spacing.base,
    paddingRight: Spacing.base,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  editorialCard: {
    width: SCREEN_WIDTH * 0.8,
    height: 180,
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
    ...Shadows.md,
  },
  editorialBgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  editorialContent: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  editorialLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xs,
  },
  editorialLabelText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  editorialTitle: {
    color: Colors.white,
    fontSize: FontSize.titleSm,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    lineHeight: 26,
  },
  editorialSubtitle: {
    color: `${Colors.white}BF`,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
  },
  editorialCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  editorialCtaText: {
    color: Colors.white,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Section title row with accent bar
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionAccentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },

  // Divider between sections
  editorialDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginVertical: Spacing.xl,
    gap: Spacing.md,
  },
  editorialDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.slate200,
  },
  editorialDividerText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // ─── Blog ───
  blogScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  seeAllBlogsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: `${Colors.primary}1A`, // 10% opacity
    gap: Spacing.xs,
  },
  seeAllBlogsText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.body,
    color: Colors.primary,
  },

  // ─── Square Category Product Cards ───
  squareProductScroll: {
    paddingLeft: Spacing.base,
    paddingRight: Spacing.base,
    gap: Spacing.md,
  },
  squareCard: {
    width: SQUARE_CARD,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  squareCardImage: {
    width: SQUARE_CARD,
    height: SQUARE_CARD,
    backgroundColor: Colors.surfaceContainerLow,
  },
  squareCardBody: {
    padding: Spacing.sm,
  },
  squareCardTitle: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.onSurface,
    lineHeight: 16,
    marginBottom: 2,
  },
  squareCardPrice: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    color: Colors.primary,
  },
});
