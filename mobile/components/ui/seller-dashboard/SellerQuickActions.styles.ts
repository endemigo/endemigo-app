import { StyleSheet } from 'react-native';
import {
  BorderRadius,
  Colors,
  FontFamily,
  FontSize,
  Shadows,
  Spacing,
} from '../../../constants/theme';

export const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.base,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    gap: Spacing.sm,
    padding: Spacing.base,
    width: '47%',
    ...Shadows.sm,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: Colors.primaryFixed,
    borderRadius: BorderRadius.lg,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  label: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.meta,
    fontWeight: '600',
    lineHeight: 18,
  },
});
