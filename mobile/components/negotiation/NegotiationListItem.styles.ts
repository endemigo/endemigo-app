import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  image: {
    backgroundColor: Colors.surfaceContainerLow,
    height: 112,
    width: 96,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  title: {
    color: Colors.onSurface,
    flex: 1,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.bodyXl,
    fontWeight: '700',
  },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.full,
    height: 22,
    justifyContent: 'center',
    minWidth: 22,
    paddingHorizontal: Spacing.xs,
  },
  unreadText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  meta: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    marginTop: Spacing.xs,
  },
  latest: {
    color: Colors.slate600,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.body,
    lineHeight: 19,
    marginTop: Spacing.sm,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
});
