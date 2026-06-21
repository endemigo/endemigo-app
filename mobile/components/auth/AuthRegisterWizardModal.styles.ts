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
  stepsIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  stepIndicator: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  stepIndicatorActive: {
    backgroundColor: Colors.primary,
  },
  stepText: {
    textAlign: 'center',
    color: Colors.slate400,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    textTransform: 'uppercase',
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: `${Colors.primary}08`,
    borderColor: `${Colors.primary}20`,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
  },
  infoText: {
    flex: 1,
    color: Colors.primary,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodySemiBold,
  },
  loginText: {
    textAlign: 'center',
    color: Colors.slate400,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    marginTop: Spacing.xs,
  },
  loginBold: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
});
