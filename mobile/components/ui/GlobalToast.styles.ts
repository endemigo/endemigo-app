import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  toast: {
    width: '100%',
    maxWidth: 520,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.lg,
  },
  success: {
    backgroundColor: Colors.secondary,
  },
  error: {
    backgroundColor: Colors.error,
  },
  info: {
    backgroundColor: Colors.primary,
  },
  message: {
    flex: 1,
    color: Colors.white,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.body,
  },
});
