import { Dimensions, StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLUMN_GAP = Spacing.sm;
const HORIZONTAL_PADDING = Spacing.base;
const COLUMN_COUNT = SCREEN_WIDTH < 380 ? 3 : 4;
const TOTAL_GAP = COLUMN_GAP * (COLUMN_COUNT - 1);
const AVAILABLE_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - TOTAL_GAP;
const COLUMN_WIDTH = AVAILABLE_WIDTH / COLUMN_COUNT;

export const launchSplashMetrics = {
  columnCount: COLUMN_COUNT,
  columnGap: COLUMN_GAP,
  imageHeight: Math.max(148, Math.min(220, SCREEN_HEIGHT * 0.24)),
};

export const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.onSurface,
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 40,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: COLUMN_GAP,
  },
  columnViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  columnTrack: {
    width: COLUMN_WIDTH,
  },
  columnTrackOffsetSm: {
    marginTop: -Spacing.xl,
  },
  columnTrackOffsetLg: {
    marginTop: -Spacing.xxxl,
  },
  imageCard: {
    width: COLUMN_WIDTH,
    height: launchSplashMetrics.imageHeight,
    borderRadius: BorderRadius['2xl'],
    marginBottom: COLUMN_GAP,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainerHigh,
    ...Shadows.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${Colors.black}55`,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  halo: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.68,
    height: SCREEN_WIDTH * 0.68,
    borderRadius: SCREEN_WIDTH,
    backgroundColor: `${Colors.primary}33`,
  },
  contentCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius['3xl'],
    backgroundColor: `${Colors.black}44`,
    borderWidth: 1,
    borderColor: `${Colors.white}22`,
  },
  logo: {
    width: Math.min(220, SCREEN_WIDTH * 0.52),
    height: 74,
  },
  tagline: {
    marginTop: Spacing.md,
    color: Colors.white,
    fontFamily: FontFamily.headline,
    fontSize: FontSize.bodyLg,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
});
