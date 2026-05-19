import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

import { CountdownTimer } from './CountdownTimer';
import { Colors } from '../../constants/theme';
import { formatAmount, formatCurrency } from '../../utils/transactionFormatters';
import { styles } from './AuctionSummaryPanel.styles';

type AuctionSummaryPanelProps = {
  currentPrice: number;
  startPrice: number;
  minBid: number;
  buyerPremiumRate: number;
  bidCount: number;
  walletAvailable?: number;
  endTime: string;
  serverTime: string;
  isActive: boolean;
  isEnded: boolean;
  isSeller: boolean;
  isWinner: boolean;
  showLoserState: boolean;
  showResultButton: boolean;
  finalPrice?: number | null;
  lastBid?: { bidderName: string; amount: number } | null;
  activityFeed?: Array<{
    id: string;
    title: string;
    body: string;
    tone: 'accent' | 'error' | 'primary';
  }>;
  onViewResult: () => void;
  t: TFunction;
};

export function AuctionSummaryPanel({
  currentPrice,
  startPrice,
  minBid,
  buyerPremiumRate,
  bidCount,
  walletAvailable,
  endTime,
  serverTime,
  isActive,
  isEnded,
  isSeller,
  isWinner,
  showLoserState,
  showResultButton,
  finalPrice,
  lastBid,
  activityFeed = [],
  onViewResult,
  t,
}: AuctionSummaryPanelProps) {
  const premiumAmount = currentPrice * buyerPremiumRate;
  const summaryTitle = isEnded ? t('auction.resultTitleEnded') : t('auction.overviewTitle');
  const leadMetricLabel = isEnded ? t('auction.finalBid') : t('auction.nextBid');
  const leadMetricValue = isEnded ? Number(finalPrice ?? currentPrice) : minBid;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.overline}>{summaryTitle}</Text>
          <Text style={styles.currentPriceLabel}>{t('auction.currentPrice')}</Text>
          <Text style={styles.currentPriceValue}>{formatCurrency(currentPrice)}</Text>
        </View>

        <View style={styles.timerShell}>
          <View style={[styles.timerBadge, isEnded && styles.timerBadgeEnded]}>
            <Text
              style={[
                styles.timerBadgeText,
                isEnded && styles.timerBadgeTextEnded,
              ]}
            >
              {isEnded ? t('auction.auctionEnded') : t('auction.timeLeftLabel')}
            </Text>
          </View>
          {isActive && endTime ? (
            <CountdownTimer endTime={endTime} serverTime={serverTime} />
          ) : (
            <Text style={styles.timerEndedText}>00:00:00</Text>
          )}
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('auction.openingPrice')}</Text>
          <Text style={styles.metricValue}>{formatCurrency(startPrice)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{leadMetricLabel}</Text>
          <Text
            style={[
              styles.metricValue,
              !isEnded && styles.metricValueAccent,
            ]}
          >
            {formatCurrency(leadMetricValue)}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>
            {t('auction.buyerPremiumRate', {
              rate: (buyerPremiumRate * 100).toFixed(0),
            })}
          </Text>
          <Text style={styles.metricValue}>{formatCurrency(premiumAmount)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('auction.bidCountLabel', { count: bidCount })}</Text>
          <Text style={styles.metricValue}>{bidCount}</Text>
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
                amount: formatCurrency(lastBid.amount),
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
              amount: formatAmount(finalPrice ?? currentPrice),
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

      {showResultButton ? (
        <TouchableOpacity
          style={styles.resultButton}
          onPress={onViewResult}
          activeOpacity={0.85}
        >
          <Ionicons name="sparkles" size={18} color={Colors.white} />
          <Text style={styles.resultButtonText}>{t('auction.seeResult')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
