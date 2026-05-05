import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  badgeActive: {
    backgroundColor: `${Colors.primary}1A`,
  },
  badgeMuted: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  text: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  textActive: {
    color: Colors.primary,
  },
  textMuted: {
    color: Colors.onSurfaceVariant,
  },
});
