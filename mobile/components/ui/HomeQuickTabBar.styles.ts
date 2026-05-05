import { StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Shadows, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: `${Colors.white}F2`,
    borderWidth: 1,
    borderColor: Colors.slate100,
    borderRadius: 18,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.tabBar,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 42,
  },
  label: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.headline,
  },
  labelActive: {
    color: Colors.primary,
  },
});
