import { StyleSheet, Dimensions } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH - Spacing.base * 2;

export const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
    width: '100%',
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    fontSize: FontSize.heading,
    color: Colors.slate900,
  },
  loadingContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius['3xl'],
  },
  carouselContainer: {
    width: '100%',
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
    ...Shadows.md,
    backgroundColor: Colors.slate100,
  },
  flatList: {
    width: '100%',
  },
  slideTouch: {
    width: CARD_WIDTH,
    marginRight: 12,
    flexShrink: 0,
    position: 'relative',
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius['3xl'],
  },
  textOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
    padding: Spacing.lg,
    borderRadius: BorderRadius['3xl'],
  },
  titleText: {
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    fontSize: FontSize.titleLg,
    color: Colors.white,
    marginBottom: Spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitleText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.sm,
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
