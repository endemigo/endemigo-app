const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SQUARE_SIZE = (SCREEN_WIDTH - 16 * 3) / 2;
import { StyleSheet, Dimensions, Platform } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';

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

  // ─── Grid variant ───
  gridCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
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
  },
  gridTitle: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  gridCategory: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.sm,
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
});
