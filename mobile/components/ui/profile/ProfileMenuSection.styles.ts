import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../../constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    marginBottom: Spacing.base,
    padding: Spacing.xs,
    ...Shadows.sm,
  },
  item: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  itemBordered: {
    borderBottomColor: Colors.slate100,
    borderBottomWidth: 1,
  },

  text: {
    color: Colors.onSurface,
    flex: 1,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  divider: {
    backgroundColor: Colors.slate100,
    height: 1,
    marginHorizontal: Spacing.base,
  },
});
