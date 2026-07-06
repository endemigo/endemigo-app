import { StyleSheet, Platform } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    padding: Spacing.base,
    paddingTop: Spacing.lg,
  },
  headerSection: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.heading,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.bodyLg,
    fontFamily: FontFamily.body,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
    padding: Spacing.xl,
    ...Shadows.md,
  },
  label: {
    fontSize: FontSize.meta,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  inputWrapper: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  input: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.body,
    color: Colors.onSurface,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadows.colored(Colors.primary),
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '700',
  },
  linkButton: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    color: Colors.onSurfaceVariant,
  },
  linkBold: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
});
