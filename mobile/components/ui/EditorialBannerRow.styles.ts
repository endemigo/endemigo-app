import { StyleSheet, Dimensions } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.8;

export const styles = StyleSheet.create({
  scroll: {
    paddingLeft: Spacing.base,
    paddingRight: Spacing.base,
    gap: Spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    height: 180,
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
    ...Shadows.md,
  },
  bgImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.4,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  label: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xs,
  },
  labelText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: Colors.white,
    fontSize: FontSize.titleSm,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    lineHeight: 26,
  },
  subtitle: {
    color: `${Colors.white}BF`,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  ctaText: {
    color: Colors.white,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
