import { StyleSheet, Dimensions } from 'react-native';
import { FontFamily, Colors } from '@/constants/theme';

export const styles = StyleSheet.create({
  headerImage: {
    color: Colors.slate400,
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  reactLogo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
  bodyText: {
    fontFamily: FontFamily.body,
  },
});
