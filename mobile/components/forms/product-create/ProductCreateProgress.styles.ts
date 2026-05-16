import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../../constants/theme';

export const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  stepTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.subheading,
  },
  stepCounter: {
    color: Colors.white,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    overflow: 'hidden',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    ...Shadows.sm,
  },
  stepCounterAuction: {
    backgroundColor: Colors.secondary,
  },
  trackRow: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.xs,
  },
  trackItem: {
    backgroundColor: Colors.slate200,
    borderRadius: BorderRadius.full,
    flex: 1,
    height: 6,
  },
  trackItemActive: {
    backgroundColor: Colors.primary,
  },
  trackItemActiveAuction: {
    backgroundColor: Colors.secondary,
  },
});
