import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

import type { BidEntry } from '../../hooks/useAuctions';
import { Colors } from '../../constants/theme';
import { formatCurrency, formatShortDateTime } from '../../utils/transactionFormatters';
import { styles } from './AuctionBidHistory.styles';

type AuctionBidHistoryProps = {
  bids: BidEntry[];
  t: TFunction;
};

export function AuctionBidHistory({ bids, t }: AuctionBidHistoryProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('auction.lastBidsTitle')}</Text>
        <Text style={styles.subtitle}>{t('auction.bidHistorySubtitle')}</Text>
      </View>

      {bids.length ? (
        <View style={styles.list}>
          {bids.map((bid, index) => {
            const isLead = index === 0;

            return (
              <View key={bid.id} style={styles.bidCard}>
                <View style={styles.bidCardTop}>
                  <View style={styles.bidCardTopLeft}>
                    <View style={[styles.rankBadge, isLead && styles.rankBadgeLead]}>
                      <Text style={[styles.rankText, isLead && styles.rankTextLead]}>
                        {index + 1}
                      </Text>
                    </View>

                    <View>
                      <Text style={styles.bidderName}>{bid.bidderName}</Text>
                      <Text style={styles.bidMeta}>
                        {isLead ? t('auction.leadBidderLabel') : t('auction.previousBidLabel')}
                        {' • '}
                        {formatShortDateTime(bid.createdAt)}
                      </Text>
                      {bid.maxAmount && Number(bid.maxAmount) > Number(bid.amount) ? (
                        <Text style={styles.proxyMeta}>
                          {t('auction.proxyMaxLabel', {
                            amount: formatCurrency(Number(bid.maxAmount)),
                          })}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.amountBlock}>
                    <Text style={[styles.amountValue, isLead && styles.amountValueLead]}>
                      {formatCurrency(Number(bid.amount))}
                    </Text>
                    <Text style={styles.premiumMeta}>
                      {t('auction.bidPremiumLabel', {
                        amount: formatCurrency(Number(bid.premiumAmount)),
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="sparkles" size={28} color={Colors.primary} />
          <Text style={styles.emptyTitle}>{t('auction.noBidsYet')}</Text>
          <Text style={styles.emptyBody}>{t('auction.noBidsPremiumHint')}</Text>
        </View>
      )}
    </View>
  );
}
