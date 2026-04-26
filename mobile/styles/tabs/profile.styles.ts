import { StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export const styles = StyleSheet.create({
  bottomSpacer: { height: 120 },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.base,
  },

  // Profile Header
  profileHeader: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.base,
    ...Shadows.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.colored(Colors.primary),
  },
  avatarText: {
    fontSize: FontSize.heading,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    color: Colors.white,
  },
  name: {
    color: Colors.onSurface,
    fontSize: FontSize.title,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
  },
  email: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    marginTop: Spacing.xs,
  },
  phone: {
    color: Colors.slate500,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.body,
    marginTop: 2,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: `${Colors.primary}10`,
    borderRadius: BorderRadius.full,
  },
  editProfileText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.caption,
    color: Colors.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  sellerBadge: {
    backgroundColor: `${Colors.primary}1A`,
  },
  buyerBadge: {
    backgroundColor: `${Colors.secondary}1A`,
  },
  badgeText: {
    fontSize: FontSize.meta,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },

  // Wallet
  walletCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    marginBottom: Spacing.base,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    ...Shadows.sm,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  walletIconBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: `${Colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletTitle: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  walletBalance: {
    color: Colors.primary,
    fontSize: FontSize.display,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '900',
    marginBottom: Spacing.xs,
  },
  walletHeldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  walletHeld: {
    color: Colors.accent,
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  walletHint: {
    color: Colors.slate400,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.body,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },

  // Menu
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xs,
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.slate100,
    marginHorizontal: Spacing.base,
  },

  // Seller Button
  sellerButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    gap: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.colored(Colors.primary),
  },
  sellerButtonContent: {
    flex: 1,
  },
  sellerButtonText: {
    color: Colors.white,
    fontSize: FontSize.subheading,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
  },
  sellerButtonSub: {
    color: `${Colors.white}CC`,
    fontSize: FontSize.meta,
    fontFamily: FontFamily.body,
    marginTop: Spacing.xs,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.errorContainer,
    padding: Spacing.base,
    borderRadius: BorderRadius['2xl'],
    gap: Spacing.sm,
  },
  logoutText: {
    color: Colors.error,
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
});
