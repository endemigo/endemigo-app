import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../constants/theme';

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
  openComposerButton: {
    backgroundColor: Colors.auctionGreen,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.base,
    paddingVertical: 16,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.colored(Colors.auctionGreen),
  },
  openComposerButtonText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.bodyXl,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalBackgroundClose: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
    ...Shadows.lg,
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

