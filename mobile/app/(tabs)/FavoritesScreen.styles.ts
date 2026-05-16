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
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.base,
  },
  heroCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius['3xl'],
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadows.md,
  },
  title: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headline,
    fontSize: FontSize.titleLg,
  },
  subtitle: {
    marginTop: Spacing.sm,
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    lineHeight: 20,
  },
  count: {
    marginTop: Spacing.sm,
    color: Colors.accent,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.meta,
  },
  grid: {
    gap: Spacing.base,
  },
  listItem: {
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  listActions: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savedAt: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.meta,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.errorContainer,
  },
  removeButtonText: {
    color: Colors.error,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.meta,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  centerTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headline,
    fontSize: FontSize.titleSm,
    textAlign: 'center',
  },
  centerBody: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    color: Colors.onPrimary,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.body,
  },
});
