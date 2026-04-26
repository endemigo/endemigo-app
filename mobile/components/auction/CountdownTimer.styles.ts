import { StyleSheet } from 'react-native';
import { FontFamily } from '../../constants/theme';

export const countdownStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
  },
  urgent: {
    backgroundColor: '#e63946',
  },
  label: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    color: '#888',
    marginBottom: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  time: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: FontFamily.bodyBold,
    color: '#fff',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  urgentText: {
    color: '#fff',
  },
});
