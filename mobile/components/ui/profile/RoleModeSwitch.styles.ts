import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '../../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    marginTop: Spacing.base,
    padding: Spacing.xs,
  },
  segment: {
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    flex: 1,
    paddingVertical: Spacing.sm,
  },
  segmentActive: {
    backgroundColor: Colors.white,
  },
  segmentDisabled: {
    opacity: 0.45,
  },
  segmentText: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: Colors.primary,
  },
});
