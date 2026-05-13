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
  wrapper: {
    gap: Spacing.base,
  },
  sectionHeader: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    color: Colors.onSurface,
    fontSize: FontSize.titleSm,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
  },
  sectionBody: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.body,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  storyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
    padding: Spacing.lg,
    gap: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    ...Shadows.sm,
  },
  description: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.bodyLg,
    lineHeight: 24,
    fontFamily: FontFamily.body,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metaCard: {
    width: '48%',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  metaLabel: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
  },
  metaValue: {
    color: Colors.onSurface,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  rulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  ruleCard: {
    width: '48%',
    minHeight: 132,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.base,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    ...Shadows.sm,
  },
  ruleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.primary}10`,
  },
  ruleTitle: {
    color: Colors.onSurface,
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  ruleBody: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.caption,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
});
