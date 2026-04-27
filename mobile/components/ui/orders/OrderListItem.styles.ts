import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../../constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  imageBox: {
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.xl,
    height: 64,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 64,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  content: {
    flex: 1,
    gap: Spacing.xs,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  code: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  amount: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headline,
    fontSize: FontSize.bodyXl,
    fontWeight: '700',
  },
  title: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  statusBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusDefault: {
    backgroundColor: Colors.slate100,
  },
  statusPayment: {
    backgroundColor: Colors.tertiaryFixed,
  },
  statusProgress: {
    backgroundColor: Colors.primaryFixed,
  },
  statusSuccess: {
    backgroundColor: Colors.secondaryContainer,
  },
  statusDanger: {
    backgroundColor: Colors.errorContainer,
  },
  statusText: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  updatedAt: {
    color: Colors.slate500,
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
  },
});
