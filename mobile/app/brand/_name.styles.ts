import { Platform, StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderBottomColor: Colors.slate100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Platform.OS === 'ios' ? 52 : Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.full,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  headerTitle: {
    color: Colors.onSurface,
    flex: 1,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    fontWeight: '700',
    marginHorizontal: Spacing.sm,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  center: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    flex: 1,
    gap: Spacing.md,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  emptyText: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.body,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  retryText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.base,
  },
  cardWrap: {
    width: '47.8%',
  },
});
