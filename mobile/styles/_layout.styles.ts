import { StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Shadows } from '../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  flex1: {
    flex: 1,
  },
  globalFloatingCartButton: {
    position: 'absolute',
    bottom: 100,
    right: 15,
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    ...Shadows.colored(Colors.primary),
  },
  globalCartBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: Colors.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    paddingHorizontal: 2,
  },
  globalCartBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
});
