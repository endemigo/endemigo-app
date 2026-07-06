import { StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.base,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.md,
  },
  icon: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.titleLg,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  verifyingTitle: {
    fontSize: FontSize.titleLg,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    color: Colors.onSurface,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    alignSelf: 'stretch',
    ...Shadows.colored(Colors.primary),
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
