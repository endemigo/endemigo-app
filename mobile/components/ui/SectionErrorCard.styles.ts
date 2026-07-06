import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.errorContainer,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  message: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.meta,
    color: Colors.onSurfaceVariant,
  },
  retryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  retryText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: FontSize.caption,
    color: Colors.white,
  },
});
