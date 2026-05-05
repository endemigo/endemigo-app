import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderColor: `${Colors.primary}33`,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    gap: Spacing.xs,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: `${Colors.primary}1A`,
    borderRadius: BorderRadius.md,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  title: {
    color: Colors.onSurface,
    flex: 1,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  status: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  statusOpen: {
    color: Colors.primary,
  },
  statusClosed: {
    color: Colors.onSurfaceVariant,
  },
  amount: {
    color: Colors.primary,
    fontFamily: FontFamily.headlineBlack,
    fontSize: FontSize.heading,
    fontWeight: '900',
    marginTop: Spacing.sm,
  },
  meta: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.xs,
    justifyContent: 'center',
    minHeight: 44,
  },
  acceptButton: {
    backgroundColor: Colors.secondary,
  },
  rejectButton: {
    backgroundColor: Colors.errorContainer,
  },
  acceptText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  rejectText: {
    color: Colors.error,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
});
