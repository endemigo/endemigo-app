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
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    flex: 1,
    gap: Spacing.sm,
    minHeight: 120,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconPrimary: {
    backgroundColor: Colors.primaryFixed,
  },
  iconSecondary: {
    backgroundColor: Colors.secondaryContainer,
  },
  iconAccent: {
    backgroundColor: Colors.tertiaryFixed,
  },
  iconNeutral: {
    backgroundColor: Colors.slate100,
  },
  value: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headlineBlack,
    fontSize: FontSize.title,
    fontWeight: '800',
  },
  label: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.meta,
    lineHeight: 18,
  },
});
