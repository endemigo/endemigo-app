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

  /* ─── Scroll container ───────────────────────────────────────── */
  scrollView: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },

  /* ─── Hero Image ─────────────────────────────────────────────── */
  heroImageContainer: {
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: 400,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  heroGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  heroBackButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    left: Spacing.lg,
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  heroShareButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    right: Spacing.lg,
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  heroBadgeRow: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroCategoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  heroCategoryText: {
    color: Colors.onSurface,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodySemiBold,
  },
  heroTrustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  heroTrustText: {
    color: Colors.secondary,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodySemiBold,
  },

  /* ─── Main Content ───────────────────────────────────────────── */
  content: {
    padding: Spacing.lg,
  },
  title: {
    color: Colors.onSurface,
    fontSize: FontSize.titleLg,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    marginBottom: Spacing.sm,
    lineHeight: 30,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  price: {
    color: Colors.primary,
    fontSize: FontSize.heading,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
  },
  askPriceHeroBadge: {
    alignItems: 'center',
    backgroundColor: Colors.primaryFixed,
    borderColor: `${Colors.primary}1A`,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  askPriceHeroText: {
    color: Colors.primary,
    fontFamily: FontFamily.headlineBlack,
    fontSize: FontSize.subheading,
    fontWeight: '800',
  },
  secureTradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: `${Colors.secondary}12`,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  secureTradeText: {
    color: Colors.secondary,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },

  /* ─── Section Header ─────────────────────────────────────────── */
  sectionTitle: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.meta,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },

  /* ─── Seller Card ──────────────────────────────────────────── */
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: `${Colors.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
    marginBottom: 2,
  },
  sellerName: {
    color: Colors.onSurface,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },

  /* ─── Description ────────────────────────────────────────────── */
  descriptionCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: Colors.slate100,
    marginBottom: Spacing.lg,
  },
  description: {
    color: Colors.onSurface,
    fontSize: FontSize.bodyLg,
    fontFamily: FontFamily.body,
    lineHeight: 24,
  },

  /* ─── Info Grid ──────────────────────────────────────────────── */
  infoGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    gap: Spacing.xs,
    ...Shadows.sm,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.slate50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  infoTitle: {
    color: Colors.onSurface,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  infoSub: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.body,
  },

  /* ─── Trust Badges ──────────────────────────────────────────── */
  trustRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  trustBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.base,
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

  /* ─── Bottom Bar ─────────────────────────────────────────────── */
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    ...Shadows.tabBar,
  },
  bottomPrice: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
    marginBottom: 2,
  },
  bottomPriceValue: {
    fontSize: FontSize.title,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    color: Colors.primary,
  },
  bottomAskPriceValue: {
    color: Colors.primary,
    fontFamily: FontFamily.headlineBlack,
    fontSize: FontSize.title,
    fontWeight: '900',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius['2xl'],
    ...Shadows.colored(Colors.accent),
  },
  askPriceButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius['2xl'],
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.base,
    ...Shadows.colored(Colors.primary),
  },
  bottomButtonText: {
    color: Colors.white,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '700',
  },
});
