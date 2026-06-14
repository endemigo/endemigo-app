import { StyleSheet, Platform } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Shadows, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  centerTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headline,
    fontSize: FontSize.titleSm,
    fontWeight: '700',
    textAlign: 'center',
  },
  centerBody: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  retryText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: 140, // Avoid overlapping behind the tab bar
    gap: Spacing.base,
  },
  header: {
    gap: Spacing.xs,
  },
  title: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headlineBlack,
    fontSize: FontSize.heading,
    fontWeight: '900',
  },
  subtitle: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
  },
  filterRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  chip: {
    backgroundColor: Colors.white,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  chipTextActive: {
    color: Colors.white,
  },
  sectionTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headline,
    fontSize: FontSize.subheading,
    fontWeight: '700',
    marginTop: Spacing.lg,
  },
  transactionCard: {
    backgroundColor: Colors.white,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  transactionTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transactionType: {
    color: Colors.onSurface,
    flex: 1,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  transactionAmountCredit: {
    color: Colors.secondary,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  transactionAmountDebit: {
    color: Colors.error,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  transactionDescription: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
  },
  transactionDate: {
    color: Colors.slate500,
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
  },
  loadingMoreContainer: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 10,
    marginBottom: Spacing.base,
  },
  dropdownButton: {
    backgroundColor: Colors.white,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Shadows.sm,
  },
  dropdownButtonText: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalMenuContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : Spacing.xl,
  },
  modalMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    marginBottom: Spacing.sm,
  },
  modalMenuTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headline,
    fontSize: FontSize.bodyXl,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  modalMenuList: {
    gap: Spacing.xs,
  },
  modalMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  modalMenuItemActive: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  modalMenuItemText: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
  },
  modalMenuItemTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  listHeaderContainer: {
    zIndex: 10,
    elevation: 10,
    gap: Spacing.base,
  },
});
