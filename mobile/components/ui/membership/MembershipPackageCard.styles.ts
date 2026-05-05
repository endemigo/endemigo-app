import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../../constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    gap: Spacing.base,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  cardCurrent: {
    borderColor: Colors.primary,
    ...Shadows.md,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  name: {
    color: Colors.onSurface,
    flex: 1,
    fontFamily: FontFamily.headline,
    fontSize: FontSize.titleSm,
    fontWeight: '700',
  },
  currentBadge: {
    backgroundColor: Colors.primaryFixed,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  currentBadgeText: {
    color: Colors.primaryContainer,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  benefitList: {
    gap: Spacing.sm,
  },
  benefitRow: {
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  benefitLabel: {
    color: Colors.slate600,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  benefitValue: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  periodList: {
    gap: Spacing.sm,
  },
  periodButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: Spacing.base,
  },
  periodButtonDisabled: {
    backgroundColor: Colors.slate400,
  },
  periodLabel: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  periodPrice: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
});
