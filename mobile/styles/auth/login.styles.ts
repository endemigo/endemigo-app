import { StyleSheet, Platform } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 80,
    paddingBottom: 50,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: BorderRadius['3xl'],
    borderBottomRightRadius: BorderRadius['3xl'],
  },
  headerContent: {
    alignItems: 'center',
  },
  logoImage: {
    width: 180,
    height: 44,
    tintColor: Colors.white,
  },
  subtitle: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.onPrimaryContainer,
    marginTop: Spacing.xs,
  },
  formContainer: {
    flex: 1,
    marginTop: -Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
    padding: Spacing.xl,
    ...Shadows.md,
  },
  formTitle: {
    fontSize: FontSize.titleLg,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  formSubtitle: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.xl,
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotText: {
    fontSize: FontSize.meta,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.primary,
    fontWeight: '600',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
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
