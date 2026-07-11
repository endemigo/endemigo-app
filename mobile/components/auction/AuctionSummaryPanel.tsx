import React from 'react';
import { Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

import { CountdownTimer } from './CountdownTimer';
import { Colors } from '../../constants/theme';
import { formatCurrency } from '../../utils/transactionFormatters';
import { styles } from './AuctionSummaryPanel.styles';

type AuctionSummaryPanelProps = {
  // Lot fiyatlarının para birimi (cüzdan alanı TL kalır).
  currency?: string;
  currentPrice: number;
  startPrice: number;
  minBid: number;
  bidCount: number;
  viewerCount: number;
  walletAvailable?: number;
  endTime: string;
  startTime?: string;
  serverTime: string;
  isActive: boolean;
  isUpcoming?: boolean;
  isEnded: boolean;
  isSeller: boolean;
  isWinner: boolean;
  showLoserState: boolean;
  showResultButton: boolean;
  finalPrice?: number | null;
  lastBid?: { bidderName: string; amount: number } | null;
  activityFeed?: {
    id: string;
    title: string;
    body: string;
    tone: 'accent' | 'error' | 'primary';
  }[];
  winnerName?: string | null;
  onViewResult?: () => void;
  onTimeExpired?: () => void;
  t: TFunction;
};

export function AuctionSummaryPanel({
  currency = 'TRY',
  currentPrice,
  startPrice,
  minBid,
  bidCount,
  viewerCount,
  walletAvailable,
  endTime,
  startTime,
  serverTime,
  isActive,
  isUpcoming,
  isEnded,
  isSeller,
  isWinner,
  showLoserState,
  showResultButton,
  finalPrice,
  lastBid,
  activityFeed = [],
  onViewResult,
  winnerName,
  onTimeExpired,
  t,
}: AuctionSummaryPanelProps) {
  const summaryTitle = isEnded ? t('auction.resultTitleEnded') : t('auction.overviewTitle');
  const leadMetricLabel = isEnded ? t('auction.finalBid') : t('auction.nextBid');
  const leadMetricValue = isEnded ? Number(finalPrice ?? currentPrice) : minBid;

  const isUpcomingAuction =
    isUpcoming ||
    (startTime &&
      new Date(startTime).getTime() >
        new Date(serverTime || Date.now()).getTime());
  const timerTarget = isUpcomingAuction ? startTime : endTime;
  const timerBadgeText = isUpcomingAuction
    ? t('auction.startsInLabel')
    : isEnded
      ? t('auction.auctionEnded')
      : t('auction.timeLeftLabel');
  const timerActive = (isActive || isUpcomingAuction) && timerTarget;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.overline}>{summaryTitle}</Text>
          <Text style={styles.currentPriceLabel}>{t('auction.currentPrice')}</Text>
          <Text style={styles.currentPriceValue}>{formatCurrency(currentPrice, currency)}</Text>
        </View>

        <View style={styles.timerShell}>
          <View style={[styles.timerBadge, isEnded && styles.timerBadgeEnded]}>
            <Text
              style={[
                styles.timerBadgeText,
                isEnded && styles.timerBadgeTextEnded,
              ]}
            >
              {timerBadgeText}
            </Text>
          </View>
          {timerActive ? (
            <CountdownTimer
              endTime={timerTarget}
              serverTime={serverTime}
              onExpired={onTimeExpired}
              label={isUpcomingAuction ? t('auction.startsInLabel') : undefined}
            />
          ) : (
            <Text style={styles.timerEndedText}>00:00:00</Text>
          )}
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('auction.openingPrice')}</Text>
          <Text style={styles.metricValue}>{formatCurrency(startPrice, currency)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{leadMetricLabel}</Text>
          <Text
            style={[
              styles.metricValue,
              !isEnded && styles.metricValueAccent,
            ]}
          >
            {formatCurrency(leadMetricValue, currency)}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('auction.bidCountLabel', { count: bidCount })}</Text>
          <Text style={styles.metricValue}>{bidCount}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('auction.viewerCountMetric')}</Text>
          <Text style={styles.metricValue}>{viewerCount}</Text>
        </View>
      </View>

      {lastBid && isActive ? (
        <View style={styles.activityStrip}>
          <Ionicons name="flash" size={18} color={Colors.accent} />
          <View style={styles.activityTextWrap}>
            <Text style={styles.activityTitle}>{t('auction.latestBidTitle')}</Text>
            <Text style={styles.activityBody}>
              {t('auction.latestBidMessage', {
                bidder: lastBid.bidderName,
                amount: formatCurrency(lastBid.amount, currency),
              })}
            </Text>
          </View>
        </View>
      ) : null}

      {activityFeed.length ? (
        <View style={styles.feedCard}>
          <Text style={styles.feedTitle}>{t('auction.activityFeedTitle')}</Text>
          <View style={styles.feedList}>
            {activityFeed.map((item) => (
              <View key={item.id} style={styles.feedItem}>
                <View
                  style={[
                    styles.feedDot,
                    item.tone === 'error'
                      ? styles.feedDotError
                      : item.tone === 'accent'
                        ? styles.feedDotAccent
                        : styles.feedDotPrimary,
                  ]}
                />
                <View style={styles.feedTextWrap}>
                  <Text style={styles.feedItemTitle}>{item.title}</Text>
                  <Text style={styles.feedItemBody}>{item.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {typeof walletAvailable === 'number' && !isSeller && isActive ? (
        <View style={styles.walletStrip}>
          <View>
            <Text style={styles.walletLabel}>{t('auction.walletAvailableLabel')}</Text>
            <Text style={styles.walletValue}>{formatCurrency(walletAvailable)}</Text>
          </View>
          <Ionicons name="wallet" size={20} color={Colors.secondary} />
        </View>
      ) : null}

      {isSeller ? (
        <View style={[styles.calloutCard, styles.sellerModeCard]}>
          <View style={styles.calloutHeader}>
            <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
            <Text style={styles.calloutTitle}>{t('auction.ownerModeTitle')}</Text>
          </View>
          <Text style={styles.calloutBody}>{t('auction.ownerModeDescription')}</Text>
        </View>
      ) : null}

      {isEnded && isWinner ? (
        <View style={[styles.calloutCard, styles.winnerCard]}>
          <View style={styles.calloutHeader}>
            <Ionicons name="trophy" size={18} color={Colors.secondary} />
            <Text style={styles.calloutTitle}>{t('auction.winnerTitle')}</Text>
          </View>
          <Text style={styles.calloutBody}>
            {t('auction.winnerMessage', {
              amount: formatCurrency(finalPrice ?? currentPrice, currency),
            })}
          </Text>
        </View>
      ) : null}

      {showLoserState ? (
        <View style={[styles.calloutCard, styles.loserCard]}>
          <View style={styles.calloutHeader}>
            <Ionicons name="close-circle" size={18} color={Colors.error} />
            <Text style={styles.calloutTitle}>{t('auction.auctionEnded')}</Text>
          </View>
          <Text style={styles.calloutBody}>{t('auction.loserMessage')}</Text>
        </View>
      ) : null}

      {isEnded && (
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: Colors.slate50,
          padding: 12,
          borderRadius: 12,
          marginTop: 16,
          borderWidth: 1,
          borderColor: Colors.slate100,
        }}>
          <Text style={{ fontSize: 14, color: Colors.slate500 }}>
            {t('auction.winner', { defaultValue: 'Kazanan' })}:
          </Text>
          {winnerName ? (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: Colors.white,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: Colors.slate100,
            }}>
              <Ionicons name="trophy-outline" size={14} color={Colors.secondary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.slate700 }}>
                {winnerName}
              </Text>
            </View>
          ) : winnerName === undefined ? (
            <ActivityIndicator size="small" color={Colors.secondary} />
          ) : (
            <Text style={{ fontSize: 14, color: Colors.slate500 }}>
              {t('auction.resultTitleNoBid', { defaultValue: 'Teklif Alınamadı' })}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
