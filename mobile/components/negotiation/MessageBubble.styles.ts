import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  rowSystem: {
    justifyContent: 'center',
  },
  bubble: {
    borderRadius: BorderRadius['2xl'],
    maxWidth: '82%',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  bubbleOwn: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: BorderRadius.sm,
  },
  bubbleOther: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: BorderRadius.sm,
    borderColor: Colors.slate100,
    borderWidth: 1,
  },
  bubbleSystem: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
  },
  body: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    lineHeight: 20,
  },
  bodyOwn: {
    color: Colors.white,
  },
  bodyOther: {
    color: Colors.onSurface,
  },
  bodySystem: {
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  time: {
    alignSelf: 'flex-end',
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  timeOwn: {
    color: `${Colors.white}CC`,
  },
  timeOther: {
    color: Colors.slate400,
  },
  timeSystem: {
    alignSelf: 'center',
    color: Colors.slate500,
  },
  offerWrapper: {
    marginBottom: Spacing.md,
  },
});
