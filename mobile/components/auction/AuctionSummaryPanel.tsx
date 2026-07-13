import React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import type { TFunction } from 'i18next';

import { CountdownTimer } from './CountdownTimer';
import { Colors } from '../../constants/theme';
import { formatCurrency } from '../../utils/transactionFormatters';

type AuctionSummaryPanelProps = {
  currency?: string;
  currentPrice: number;
  startPrice: number;
  minBid: number;
  bidCount: number;
  viewerCount: number;
  endTime: string;
  startTime?: string;
  serverTime: string;
  isUntimed?: boolean;
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
    at?: string;
  }[];
  winnerName?: string | null;
  onViewResult?: () => void;
  onTimeExpired?: () => void;
  t: TFunction;
};

// Minimal / düz fiyat özeti: ağır kart + gri metrik kutuları yerine
// büyük fiyat metni + sade zaman/next-bid satırı. Yalnız tekil lot ekranında.
export function AuctionSummaryPanel({
  currency = 'TRY',
  currentPrice,
  startPrice,
  minBid,
  bidCount,
  endTime,
  startTime,
  serverTime,
  isUntimed,
  isUpcoming,
  isEnded,
  isWinner,
  showLoserState,
  finalPrice,
  winnerName,
  onTimeExpired,
  t,
}: AuctionSummaryPanelProps) {
  const isUpcomingAuction =
    isUpcoming ||
    (startTime &&
      new Date(startTime).getTime() >
        new Date(serverTime || Date.now()).getTime());
  const timerTarget = isUpcomingAuction ? startTime : endTime;
  const timerLabel = isUpcomingAuction
    ? t('auction.startsInLabel')
    : t('auction.timeLeftLabel');

  const priceLabel = isEnded
    ? winnerName
      ? t('auction.soldForLabel', { defaultValue: 'Satıldı' })
      : t('auction.resultTitleNoBid', { defaultValue: 'Teklif Alınamadı' })
    : bidCount > 0
      ? t('auction.currentPrice')
      : t('auction.startingBid');
  const priceValue = isEnded ? Number(finalPrice ?? currentPrice) : currentPrice;

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: Colors.slate400 }}>{priceLabel}</Text>
          <Text
            style={{
              fontSize: 30,
              fontWeight: '700',
              color: Colors.onSurface,
              letterSpacing: -0.5,
              marginTop: 2,
            }}
          >
            {formatCurrency(priceValue, currency)}
          </Text>
        </View>

        {!isEnded ? (
          <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
            {!isUntimed ? (
              <Text style={{ fontSize: 11, color: Colors.slate400, marginBottom: 2 }}>{timerLabel}</Text>
            ) : null}
            {isUntimed ? (
              <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.error }}>
                {t('auctions.untimed', { defaultValue: 'Süresiz' })}
              </Text>
            ) : timerTarget ? (
              <CountdownTimer endTime={timerTarget} serverTime={serverTime} onExpired={onTimeExpired} />
            ) : null}
          </View>
        ) : null}
      </View>

      {!isEnded ? (
        <Text style={{ fontSize: 13, color: Colors.slate500, marginTop: 10, lineHeight: 19 }}>
          {t('auction.nextBid')}:{' '}
          <Text style={{ color: Colors.auctionGreen, fontWeight: '700' }}>
            {formatCurrency(minBid, currency)}
          </Text>
          {'   ·   '}
          {t('auction.openingPrice')}: {formatCurrency(startPrice, currency)}
          {'   ·   '}
          {t('auction.bidCountMetric', { defaultValue: 'Teklif' })}: {bidCount}
        </Text>
      ) : null}

      {isEnded ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <Text style={{ fontSize: 13, color: Colors.slate500 }}>
            {t('auction.winner', { defaultValue: 'Kazanan' })}:
          </Text>
          {winnerName ? (
            <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.slate700 }}>{winnerName}</Text>
          ) : winnerName === undefined ? (
            <ActivityIndicator size="small" color={Colors.secondary} />
          ) : (
            <Text style={{ fontSize: 13, color: Colors.slate500 }}>
              {t('auction.resultTitleNoBid', { defaultValue: 'Teklif Alınamadı' })}
            </Text>
          )}
        </View>
      ) : null}

      {isEnded && isWinner ? (
        <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.auctionGreen, marginTop: 6 }}>
          {t('auction.winnerTitle')}
        </Text>
      ) : null}
      {showLoserState ? (
        <Text style={{ fontSize: 13, color: Colors.slate500, marginTop: 6 }}>
          {t('auction.loserMessage')}
        </Text>
      ) : null}
    </View>
  );
}
