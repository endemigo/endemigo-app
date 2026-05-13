import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '../../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.xs,
  },
  option: {
    alignItems: 'center',
    backgroundColor: Colors.transparent,
    borderRadius: BorderRadius.lg,
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  optionActive: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  optionActiveDirectSale: {
    borderColor: `${Colors.primary}40`,
  },
  optionActiveAuction: {
    borderColor: `${Colors.secondary}40`,
  },
  optionLabel: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.body,
    marginBottom: 4,
  },
  optionLabelActive: {
    color: Colors.primary,
  },
  optionLabelActiveDirectSale: {
    color: Colors.primary,
  },
  optionLabelActiveAuction: {
    color: Colors.secondary,
  },
  optionHint: {
    color: Colors.slate500,
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    textAlign: 'center',
  },
});
