import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../../constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.base,
    ...Shadows.md,
  },
  eyebrow: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  title: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headlineBlack,
    fontSize: FontSize.title,
    fontWeight: '900',
  },
  sellerOnly: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    lineHeight: 20,
  },
  benefit: {
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  benefitHighlighted: {
    backgroundColor: Colors.primaryFixed,
  },
  benefitText: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  highlightedLabel: {
    color: Colors.primaryContainer,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
});
