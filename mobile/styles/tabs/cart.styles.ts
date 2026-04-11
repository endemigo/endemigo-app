import { StyleSheet, Dimensions } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    backgroundColor: `${Colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.title,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.bodyLg,
    fontFamily: FontFamily.body,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.xl,
  },
  buttonText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: FontSize.bodyXl,
  },
});
