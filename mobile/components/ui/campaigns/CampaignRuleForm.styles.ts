import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../../constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  title: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headline,
    fontSize: FontSize.subheading,
    fontWeight: '700',
  },
  description: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  label: {
    color: Colors.slate600,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  input: {
    backgroundColor: Colors.slate50,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    color: Colors.onSurface,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  segmentedButton: {
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  segmentedButtonActive: {
    backgroundColor: Colors.primaryFixed,
    borderColor: Colors.primary,
  },
  segmentedText: {
    color: Colors.slate600,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
    textAlign: 'center',
  },
  segmentedTextActive: {
    color: Colors.primaryContainer,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  halfField: {
    flex: 1,
    gap: Spacing.sm,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    minHeight: 48,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.slate400,
  },
  submitText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
});
