import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: `${Colors.black}66`,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
    gap: Spacing.md,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: Colors.slate200,
    borderRadius: BorderRadius.full,
    height: 4,
    marginBottom: Spacing.xs,
    width: 44,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headlineBlack,
    fontSize: FontSize.title,
    fontWeight: '800',
    marginTop: Spacing.xs,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  productTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.bodyXl,
    fontWeight: '600',
    lineHeight: 22,
  },
  minimumText: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    color: Colors.onSurface,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    minHeight: 48,
    paddingHorizontal: Spacing.base,
  },
  amountInput: {
    flex: 1,
  },
  quantityInput: {
    width: 88,
  },
  noteInput: {
    minHeight: 92,
    paddingTop: Spacing.base,
    textAlignVertical: 'top',
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    minHeight: 52,
    ...Shadows.colored(Colors.primary),
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitText: {
    color: Colors.white,
    fontFamily: FontFamily.headlineBlack,
    fontSize: FontSize.bodyXl,
    fontWeight: '800',
  },
});
