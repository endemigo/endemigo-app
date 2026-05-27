import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 300,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.xl,
  },
  stickyComposer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
  },
  withdrawButton: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  withdrawButtonText: {
    color: Colors.error,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.full,
  },
});
