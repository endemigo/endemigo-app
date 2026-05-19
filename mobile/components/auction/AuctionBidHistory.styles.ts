import { StyleSheet } from 'react-native';
import {
  BorderRadius,
  Colors,
  FontFamily,
  FontSize,
  Shadows,
  Spacing,
} from '../../constants/theme';

export const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.base,
  },
  header: {
    gap: Spacing.xs,
  },
  title: {
    color: Colors.onSurface,
    fontSize: FontSize.titleSm,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
  },
  list: {
    gap: Spacing.sm,
  },
  bidCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    ...Shadows.sm,
  },
  bidCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.base,
  },
  bidCardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainer,
  },
  rankBadgeLead: {
    backgroundColor: Colors.auctionGreen,
  },
  rankText: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  rankTextLead: {
    color: Colors.white,
  },
  bidderName: {
    color: Colors.onSurface,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  bidMeta: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    marginTop: 2,
  },
  proxyMeta: {
    color: Colors.accent,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodySemiBold,
    marginTop: 4,
  },
  amountBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amountValue: {
    color: Colors.onSurface,
    fontSize: FontSize.subheading,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '700',
  },
  amountValueLead: {
    color: Colors.auctionGreen,
  },
  premiumMeta: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  emptyTitle: {
    color: Colors.onSurface,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  emptyBody: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.body,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
});
