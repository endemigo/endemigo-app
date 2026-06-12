import { StyleSheet, Dimensions } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;

export const styles = StyleSheet.create({
  wrapper: {
    paddingLeft: Spacing.base,
    marginBottom: Spacing.xl,
  },
  card: {
    width: CARD_WIDTH,
    height: 192,
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
    ...Shadows.lg,
  },
  bgImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.35,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  badge: {
    backgroundColor: `${Colors.white}40`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  badgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    fontSize: FontSize.titleLg,
    color: Colors.white,
    lineHeight: 30,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyMedium,
    color: `${Colors.white}CC`,
    maxWidth: 220,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.slate300,
  },
  dotActive: {
    width: 18,
    backgroundColor: Colors.primary,
  },
});
