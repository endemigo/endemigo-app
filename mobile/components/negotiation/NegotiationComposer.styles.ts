import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderTopColor: Colors.slate100,
    borderTopWidth: 1,
    padding: Spacing.base,
    ...Shadows.tabBar,
  },
  offerPanel: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    padding: Spacing.base,
  },
  offerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  offerTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.bodyXl,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    color: Colors.onSurface,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  flexInput: {
    flex: 1,
  },
  quantityInput: {
    width: 84,
  },
  noteInput: {
    minHeight: 72,
    paddingTop: Spacing.md,
    textAlignVertical: 'top',
  },
  expiryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  expiryChip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  expiryChipActive: {
    backgroundColor: `${Colors.primary}1A`,
    borderColor: Colors.primary,
  },
  expiryChipInactive: {
    backgroundColor: Colors.white,
    borderColor: Colors.slate200,
  },
  expiryChipText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  expiryChipTextActive: {
    color: Colors.primary,
  },
  expiryChipTextInactive: {
    color: Colors.onSurfaceVariant,
  },
  offerButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    minHeight: 46,
  },
  offerButtonText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  messageRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: `${Colors.primary}12`,
    borderRadius: BorderRadius.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  messageInput: {
    backgroundColor: Colors.surfaceContainerLow,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    color: Colors.onSurface,
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    maxHeight: 110,
    minHeight: 42,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
