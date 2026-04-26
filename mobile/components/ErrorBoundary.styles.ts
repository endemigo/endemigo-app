import { StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius } from '../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: FontSize.titleLg,
    fontFamily: FontFamily.headlineBlack,
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  errorDetails: {
    backgroundColor: Colors.surfaceContainer,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    width: '100%',
    marginBottom: Spacing.xl,
  },
  errorText: {
    fontFamily: FontFamily.body,
    color: Colors.error,
    fontSize: FontSize.caption,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
  },
});
