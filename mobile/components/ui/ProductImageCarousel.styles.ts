import { StyleSheet, Dimensions } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
  listContainer: {
    flexGrow: 0,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: Spacing.sm,
    left: 0,
    right: 0,
    gap: Spacing.xs,
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: `${Colors.white}60`,
  },
  dotActive: {
    width: 16,
    backgroundColor: Colors.white,
  },
});
