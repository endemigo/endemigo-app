import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '../../../constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  title: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headline,
    fontSize: FontSize.subheading,
    fontWeight: '700',
  },
  step: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
  },
  marker: {
    alignItems: 'center',
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.full,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  markerActive: {
    backgroundColor: Colors.primaryFixed,
  },
  markerDone: {
    backgroundColor: Colors.secondaryContainer,
  },
  markerText: {
    color: Colors.slate600,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  stepTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  stepMeta: {
    color: Colors.slate500,
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    marginTop: Spacing.xs,
  },
});
