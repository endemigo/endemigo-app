import { StyleSheet, Platform } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, Shadows } from '../../constants/theme';

export const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: `${Colors.white}F2`,
    borderTopColor: Colors.slate100,
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : Spacing.sm,
    paddingTop: Spacing.sm,
    height: Platform.OS === 'ios' ? 88 : 64,
    position: 'absolute',
    ...Shadows.tabBar,
  },
  tabBarLabel: {
    fontFamily: FontFamily.headline,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  header: {
    backgroundColor: Colors.white,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  headerTitle: {
    fontFamily: FontFamily.headline,
    fontWeight: '700',
    fontSize: FontSize.subheading,
    color: Colors.primary,
  },
  auctionIcon: {
    width: 24,
    height: 24,
  },
  auctionIconActive: {
    opacity: 1,
    tintColor: Colors.auctionGreen,
  },
  auctionIconInactive: {
    opacity: 0.6,
    tintColor: Colors.auctionGreen,
  },
  auctionLabelActive: {
    color: Colors.auctionGreen,
    opacity: 1,
  },
  auctionLabelInactive: {
    color: Colors.auctionGreen,
    opacity: 0.6,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.accent,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  cartBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
});
