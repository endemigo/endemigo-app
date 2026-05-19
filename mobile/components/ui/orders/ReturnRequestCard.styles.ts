import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '../../../constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.base,
  },
  title: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headline,
    fontSize: FontSize.subheading,
    fontWeight: '700',
  },
  body: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.onSurface,
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
  },
  chipTextActive: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  input: {
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    color: Colors.onSurface,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    minHeight: 96,
    padding: Spacing.md,
    textAlignVertical: 'top',
  },
  button: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
});
