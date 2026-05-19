import { StyleSheet } from 'react-native';
import { BorderRadius, Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.base,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
    paddingTop: 60,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    color: Colors.onSurface,
    flex: 1,
    fontFamily: FontFamily.headlineBlack,
    fontSize: FontSize.subheading,
    fontWeight: '800',
  },
  spacer: {
    width: 40,
  },
  content: {
    gap: Spacing.base,
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  card: {
    backgroundColor: Colors.white,
    borderColor: Colors.slate100,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  eyebrow: {
    color: Colors.primary,
    fontFamily: FontFamily.label,
    fontSize: FontSize.meta,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.onSurface,
    fontFamily: FontFamily.headlineBlack,
    fontSize: FontSize.title,
    fontWeight: '900',
  },
  summary: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    lineHeight: 22,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.onSurface,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  paragraph: {
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    lineHeight: 22,
  },
});
