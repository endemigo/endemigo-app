import { StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius } from '../../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
    color: Colors.onSurface,
    fontSize: FontSize.subheading,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 36,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.base,
  },
  gridRow: {
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  cardWrap: {
    width: '47.8%',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  emptyText: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.sm,
  },
  retryText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
  },
  bottomSpacer: {
    height: 120,
  },

  // Subcategories Navigation
  subcategoriesScroll: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    paddingVertical: Spacing.sm,
  },
  subcategoriesContent: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  subcategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
    gap: Spacing.xs,
  },
  subcategoryChipActive: {
    backgroundColor: Colors.primaryFixed,
  },
  subcategoryChipText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.slate600,
  },
  subcategoryChipTextActive: {
    color: Colors.primary,
  },
  subcategoryCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate200,
  },
  subcategoryCountBadgeActive: {
    backgroundColor: Colors.white,
  },
  subcategoryCountText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bodyBold,
    color: Colors.slate500,
  },
  subcategoryCountTextActive: {
    color: Colors.primary,
  },

  // Empty State Customizations
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: `${Colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.bodyXl,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    color: Colors.onSurface,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 240,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.md,
  },
  primaryButtonText: {
    color: Colors.white,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '800',
    fontSize: FontSize.body,
  },
});

