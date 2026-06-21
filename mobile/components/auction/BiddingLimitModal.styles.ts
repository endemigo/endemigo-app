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
  shell: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: Colors.onSurface,
    fontSize: FontSize.title,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '700',
  },
  closeButton: {
    padding: Spacing.xs,
  },
  subtitle: {
    color: Colors.slate500,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    lineHeight: 18,
  },
  limitInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  limitItem: {
    alignItems: 'center',
    flex: 1,
  },
  limitLabel: {
    fontSize: FontSize.xs,
    color: Colors.slate500,
    fontFamily: FontFamily.bodyBold,
    marginBottom: Spacing.xs,
  },
  limitValue: {
    fontSize: FontSize.title,
    color: Colors.onSurface,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    backgroundColor: Colors.outlineVariant,
    marginHorizontal: Spacing.base,
  },
  depositBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: `${Colors.primary}08`,
    borderColor: `${Colors.primary}20`,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
  },
  depositTextContainer: {
    flex: 1,
  },
  depositTitle: {
    fontSize: FontSize.caption,
    color: Colors.primary,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  depositAmount: {
    fontSize: FontSize.body,
    color: Colors.primary,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    marginTop: 2,
  },
  form: {
    gap: Spacing.sm,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '600',
    paddingLeft: Spacing.xs,
  },
  inputShell: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  input: {
    paddingVertical: 12,
    color: Colors.onSurface,
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  col: {
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius['2xl'],
    paddingVertical: 16,
    ...Shadows.colored(Colors.primary),
    marginTop: Spacing.sm,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  toggleCardButton: {
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  toggleCardText: {
    fontSize: FontSize.caption,
    color: Colors.primary,
    fontFamily: FontFamily.bodyBold,
  },
});
