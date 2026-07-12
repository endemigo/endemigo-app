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
    gap: Spacing.sm,
  },
  card: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.sm,
    width: '31.5%',
    ...Shadows.sm,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: Colors.primaryFixed,
    borderRadius: BorderRadius.lg,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  label: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.meta,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
  },
});
