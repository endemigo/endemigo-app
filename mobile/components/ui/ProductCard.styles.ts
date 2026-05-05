import { StyleSheet, Dimensions } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SQUARE_SIZE = (SCREEN_WIDTH - 16 * 3) / 2;

export const styles = StyleSheet.create({
  // ─── Square variant ───
  squareCard: {
    width: SQUARE_SIZE,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  squareImage: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    backgroundColor: Colors.surfaceContainerLow,
  },
  squareBody: {
    padding: Spacing.sm,
  },
  squareBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.secondary}16`,
    borderRadius: BorderRadius.full,
    color: Colors.secondary,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xs,
    marginBottom: Spacing.xs,
    overflow: 'hidden',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  squareTitle: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.onSurface,
    lineHeight: 16,
    marginBottom: 2,
  },
  squarePrice: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    color: Colors.primary,
  },
  squareCtaHint: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  squareAskPriceBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.primary}12`,
    borderColor: `${Colors.primary}1A`,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  squareAskPriceText: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },

  // ─── Grid variant ───
  gridCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
    minHeight: 268,
  },
  gridImageContainer: {
    height: 160,
    backgroundColor: Colors.surfaceContainerLow,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridBody: {
    padding: Spacing.md,
    minHeight: 108,
  },
  gridBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.secondary}16`,
    borderRadius: BorderRadius.full,
    color: Colors.secondary,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xs,
    marginBottom: Spacing.xs,
    overflow: 'hidden',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  gridTitle: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
    lineHeight: 20,
    minHeight: 40,
  },
  gridCategory: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.sm,
    minHeight: 16,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridPrice: {
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    color: Colors.primary,
  },
  gridCtaHint: {
    color: Colors.secondary,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  gridAskPriceButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    gap: Spacing.xs,
    minHeight: 32,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  gridAskPriceText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
});
