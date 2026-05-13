import { StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  accentBar: {
    width: 3,
    height: 24,
    borderRadius: 1.5,
    backgroundColor: Colors.primary,
  },
  title: {
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    fontSize: FontSize.subheading,
    color: Colors.onSurface,
  },
  seeAll: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
});
