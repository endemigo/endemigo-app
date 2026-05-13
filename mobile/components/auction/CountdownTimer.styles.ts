import { StyleSheet } from 'react-native';
import { Colors, FontFamily } from '../../constants/theme';

export const countdownStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: Colors.inverseSurface,
  },
  urgent: {
    backgroundColor: Colors.error,
  },
  label: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.slate500,
    marginBottom: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  time: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: FontFamily.bodyBold,
    color: Colors.white,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  urgentText: {
    color: Colors.white,
  },
});
