import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 8,
    right: 64,
    bottom: 8,
    justifyContent: 'flex-end',
    gap: 4,
  },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bubbleTitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '700',
  },
  bubbleTitleAlert: {
    color: '#FFB4AB',
  },
  bubbleBody: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 15,
  },
});
