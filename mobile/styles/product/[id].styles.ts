import { StyleSheet, Dimensions, Platform } from 'react-native';
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

  // Image
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 320,
    backgroundColor: Colors.surfaceContainerLow,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    left: Spacing.base,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  shareButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    right: Spacing.base,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },

  // Content
  content: {
    padding: Spacing.lg,
  },
  categoryBadge: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  categoryText: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  title: {
    color: Colors.onSurface,
    fontSize: FontSize.titleLg,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    marginBottom: Spacing.sm,
    lineHeight: 30,
  },
  price: {
    color: Colors.primary,
    fontSize: FontSize.heading,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    marginBottom: Spacing.lg,
  },

  // Seller
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: `${Colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    color: Colors.slate400,
  },
  sellerName: {
    color: Colors.onSurface,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },

  // Section
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.meta,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  descriptionCard: {
    backgroundColor: Colors.white,
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  description: {
    color: Colors.onSurface,
    fontSize: FontSize.bodyLg,
    fontFamily: FontFamily.body,
    lineHeight: 24,
  },

  // Trust Badges
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
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  trustText: {
    fontSize: 10,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.base,
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
  },
  bottomPriceValue: {
    fontSize: FontSize.title,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    color: Colors.primary,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.xl,
    ...Shadows.colored(Colors.accent),
  },
  addToCartText: {
    color: Colors.white,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '700',
  },
});
