import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '../../../constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.base,
  },
  title: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headline,
    fontSize: FontSize.subheading,
    fontWeight: '700',
  },
  body: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    lineHeight: 20,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryFixed,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  statusText: {
    color: Colors.primaryContainer,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  note: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  dangerButton: {
    backgroundColor: Colors.error,
  },
  neutralButton: {
    backgroundColor: Colors.slate900,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  proofImage: {
    borderRadius: BorderRadius.lg,
    height: 80,
    width: 80,
  },
  proofImageLabel: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headline,
    fontSize: FontSize.caption,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
});
