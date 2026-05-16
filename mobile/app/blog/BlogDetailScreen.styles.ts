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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  heroImage: {
    width: '100%',
    height: 260,
    backgroundColor: Colors.surfaceContainer,
  },
  body: {
    marginTop: -Spacing.xl,
    marginHorizontal: Spacing.base,
    padding: Spacing.lg,
    borderRadius: BorderRadius['3xl'],
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadows.md,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.base,
  },
  backText: {
    color: Colors.primary,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.meta,
  },
  category: {
    color: Colors.primary,
    fontFamily: FontFamily.label,
    fontSize: FontSize.caption,
  },
  title: {
    marginTop: Spacing.sm,
    color: Colors.onSurface,
    fontFamily: FontFamily.headline,
    fontSize: FontSize.titleLg,
  },
  meta: {
    marginTop: Spacing.sm,
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.meta,
  },
  excerpt: {
    marginTop: Spacing.base,
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.bodyLg,
    lineHeight: 22,
  },
  paragraph: {
    marginTop: Spacing.base,
    color: Colors.onSurface,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    lineHeight: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  centerTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headline,
    fontSize: FontSize.titleSm,
    textAlign: 'center',
  },
  centerBody: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    textAlign: 'center',
  },
});
