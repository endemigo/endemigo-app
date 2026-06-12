import { StyleSheet } from 'react-native';
import {
  BorderRadius,
  Colors,
  FontFamily,
  FontSize,
  Shadows,
  Spacing,
} from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    flex: 1,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: 140,
  },
  center: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  centerTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.subheading,
    fontWeight: '700',
  },
  centerBody: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    lineHeight: 22,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  hero: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius['4xl'],
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
    ...Shadows.colored(Colors.primary),
  },
  eyebrow: {
    color: `${Colors.white}CC`,
    fontFamily: FontFamily.label,
    fontSize: FontSize.meta,
    letterSpacing: 1,
  },
  title: {
    color: Colors.white,
    fontFamily: FontFamily.headlineBlack,
    fontSize: FontSize.titleLg,
    fontWeight: '800',
  },
  subtitle: {
    color: `${Colors.white}E6`,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    lineHeight: 22,
  },
  heroBalanceRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  heroBalanceCard: {
    backgroundColor: `${Colors.white}14`,
    borderRadius: BorderRadius['2xl'],
    flex: 1,
    padding: Spacing.base,
  },
  heroBalanceLabel: {
    color: `${Colors.white}BF`,
    fontFamily: FontFamily.body,
    fontSize: FontSize.meta,
  },
  heroBalanceValue: {
    color: Colors.white,
    fontFamily: FontFamily.headlineBlack,
    fontSize: FontSize.subheading,
    fontWeight: '800',
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.subheading,
    fontWeight: '700',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  retryText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
});
