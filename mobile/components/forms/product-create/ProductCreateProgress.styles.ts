import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '../../../constants/theme';

export const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.base,
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
    fontSize: FontSize.bodyXl,
  },
  stepCounter: {
    color: Colors.primary,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.caption,
  },
  trackRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
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
});
