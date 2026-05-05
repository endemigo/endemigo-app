import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    flex: 1,
  },
  center: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    flex: 1,
    gap: Spacing.md,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  centerText: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.body,
    textAlign: 'center',
  },
  backAction: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backActionText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderBottomColor: Colors.slate100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xxl,
    ...Shadows.sm,
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.bodyXl,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    marginTop: Spacing.xs,
  },
  statusRow: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  emptyThread: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  emptyTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.bodyXl,
    fontWeight: '700',
  },
  emptyText: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    lineHeight: 20,
    textAlign: 'center',
  },
});
