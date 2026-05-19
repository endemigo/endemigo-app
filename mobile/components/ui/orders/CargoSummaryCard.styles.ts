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
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  label: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
  },
  value: {
    color: Colors.onSurface,
    flex: 1,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
    textAlign: 'right',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryFixed,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  statusText: {
    color: Colors.primaryContainer,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  emptyText: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    lineHeight: 20,
  },
  shipmentCard: {
    borderColor: Colors.slate100,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  shipmentTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  timelineItem: {
    borderLeftColor: Colors.slate200,
    borderLeftWidth: 2,
    gap: Spacing.xs,
    paddingLeft: Spacing.md,
  },
  timelineTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  timelineMeta: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
  },
});
