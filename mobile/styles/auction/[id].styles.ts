import { StyleSheet, Platform } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  // Image
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 280, backgroundColor: Colors.surfaceContainerLow },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    left: Spacing.base,
    width: 40, height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center', alignItems: 'center',
    ...Shadows.sm,
  },
  liveIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 44,
    right: Spacing.base,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.white },
  liveText: { color: Colors.white, fontSize: 10, fontFamily: FontFamily.bodyBold, fontWeight: '700' },

  content: { padding: Spacing.lg },
  title: { color: Colors.onSurface, fontSize: FontSize.titleLg, fontFamily: FontFamily.headlineBlack, fontWeight: '800', marginBottom: Spacing.base },

  // Price Card
  priceCard: { backgroundColor: Colors.white, padding: Spacing.lg, borderRadius: BorderRadius['2xl'], marginBottom: Spacing.base, borderWidth: 1, borderColor: Colors.slate100, ...Shadows.sm },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  priceLabel: { color: Colors.onSurfaceVariant, fontSize: FontSize.body, fontFamily: FontFamily.body },
  priceValue: { color: Colors.auctionGreen, fontSize: FontSize.heading, fontFamily: FontFamily.headlineBlack, fontWeight: '900' },
  premiumValue: { color: '#F59E0B', fontSize: FontSize.bodyXl, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.slate100, marginVertical: Spacing.md },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  timerLabel: { color: Colors.onSurfaceVariant, fontSize: FontSize.body, fontFamily: FontFamily.body },
  timerValue: { color: Colors.secondary, fontSize: FontSize.titleSm, fontFamily: FontFamily.headlineBlack, fontWeight: '800', fontVariant: ['tabular-nums'] },
  timerEnded: { color: Colors.error },
  bidCountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm },
  bidCount: { color: Colors.onSurfaceVariant, fontSize: FontSize.meta, fontFamily: FontFamily.body },

  // Bid Card
  bidCard: { backgroundColor: Colors.white, padding: Spacing.lg, borderRadius: BorderRadius['2xl'], marginBottom: Spacing.base, borderLeftWidth: 4, borderLeftColor: Colors.auctionGreen, ...Shadows.sm },
  bidHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  bidHeaderTitle: { fontSize: FontSize.bodyXl, fontFamily: FontFamily.headlineBlack, fontWeight: '800', color: Colors.onSurface },
  bidMinLabel: { fontSize: FontSize.caption, fontFamily: FontFamily.body, color: Colors.onSurfaceVariant },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
  walletInfo: { color: Colors.secondary, fontSize: FontSize.body, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  bidInputRow: { flexDirection: 'row', gap: Spacing.md },
  bidInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.outlineVariant, paddingHorizontal: Spacing.base },
  bidCurrency: { fontSize: FontSize.subheading, fontFamily: FontFamily.headlineBlack, fontWeight: '800', color: Colors.onSurfaceVariant, marginRight: Spacing.xs },
  bidInput: { flex: 1, paddingVertical: 14, color: Colors.onSurface, fontSize: FontSize.subheading, fontFamily: FontFamily.headlineBlack, fontWeight: '700' },
  bidButton: { flexDirection: 'row', backgroundColor: Colors.auctionGreen, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.lg, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, ...Shadows.colored(Colors.auctionGreen) },
  bidButtonDisabled: { opacity: 0.5 },
  bidButtonText: { color: Colors.white, fontSize: FontSize.body, fontFamily: FontFamily.headlineBlack, fontWeight: '800' },
  premiumInfo: { color: '#F59E0B', fontSize: FontSize.caption, fontFamily: FontFamily.body, marginTop: Spacing.sm },

  resultButton: { flexDirection: 'row', backgroundColor: Colors.auctionGreen, padding: Spacing.lg, borderRadius: BorderRadius['2xl'], alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.base, ...Shadows.colored(Colors.auctionGreen) },
  resultButtonText: { color: Colors.white, fontSize: FontSize.subheading, fontFamily: FontFamily.headlineBlack, fontWeight: '700' },

  sellerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: `${Colors.primary}1A`, padding: Spacing.base, borderRadius: BorderRadius.xl, marginBottom: Spacing.base },
  sellerNoteText: { color: Colors.primary, fontSize: FontSize.body, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },

  // Bid History
  sectionTitle: { color: Colors.onSurfaceVariant, fontSize: FontSize.meta, fontFamily: FontFamily.bodySemiBold, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md },
  bidItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, padding: Spacing.base, borderRadius: BorderRadius.xl, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.slate100 },
  bidItemFirst: { borderColor: Colors.auctionGreen, borderWidth: 1.5 },
  bidItemLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  bidRank: { width: 28, height: 28, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center' },
  bidRankFirst: { backgroundColor: Colors.auctionGreen },
  bidRankText: { fontSize: FontSize.caption, fontFamily: FontFamily.bodyBold, fontWeight: '700', color: Colors.onSurfaceVariant },
  bidRankTextFirst: { color: Colors.white },
  bidName: { color: Colors.onSurface, fontSize: FontSize.body, fontFamily: FontFamily.bodyMedium },
  bidAmount: { color: Colors.onSurface, fontSize: FontSize.bodyXl, fontFamily: FontFamily.headlineBlack, fontWeight: '700' },
  bidAmountFirst: { color: Colors.auctionGreen },
  noBidsContainer: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  noBids: { color: Colors.slate400, fontSize: FontSize.body, fontFamily: FontFamily.body },
  spacer: { height: 40 },

  // ─── Phase 5: Socket.IO + Real-time Additions ────────

  viewerBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 44,
    right: 76,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  viewerText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 2,
  },

  lotNumber: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },

  lastBidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  lastBidText: {
    color: '#F59E0B',
    fontSize: FontSize.body,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },

  winnerBanner: {
    alignItems: 'center',
    backgroundColor: '#065f46',
    padding: Spacing.xl,
    borderRadius: BorderRadius['2xl'],
    marginBottom: Spacing.base,
  },
  winnerEmoji: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  winnerTitle: {
    color: Colors.white,
    fontSize: FontSize.heading,
    fontFamily: FontFamily.headlineBlack,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  winnerText: {
    color: '#d1fae5',
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    textAlign: 'center',
  },

  loserBanner: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    marginBottom: Spacing.base,
  },
  loserText: {
    color: Colors.error,
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    textAlign: 'center',
  },
});
