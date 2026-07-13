import React from 'react';
import { Text, View } from 'react-native';
import type { TFunction } from 'i18next';

import { Colors } from '../../constants/theme';
import { formatCurrency } from '../../utils/transactionFormatters';

type AuctionRulesPanelProps = {
  sellerName?: string | null;
  categoryName?: string;
  conditionLabel: string;
  description?: string;
  auctionTypeLabel: string;
  minIncrement: number;
  reservePrice?: number | null;
  reserveMet?: boolean;
  antiSnipingEnabled?: boolean;
  extensionSeconds?: number;
  currentExtensions?: number;
  maxExtensions?: number;
  culturalAssetRestricted?: boolean;
  t: TFunction;
};

// Minimal / düz kurallar paneli: story kartı + metrik grid yerine düz açıklama
// metni + ince-ayraçlı etiket/değer satırları. Yalnız tekil lot ekranında.
export function AuctionRulesPanel({
  conditionLabel,
  description,
  auctionTypeLabel,
  minIncrement,
  reservePrice,
  reserveMet,
  antiSnipingEnabled,
  extensionSeconds,
  currentExtensions,
  maxExtensions,
  culturalAssetRestricted,
  t,
}: AuctionRulesPanelProps) {
  const rows = [
    { key: 'condition', label: t('auction.conditionLabel'), value: conditionLabel },
    { key: 'type', label: t('auction.ruleAuctionType'), value: auctionTypeLabel },
    { key: 'increment', label: t('auction.ruleIncrement'), value: formatCurrency(minIncrement) },
    {
      key: 'reserve',
      label: t('auction.ruleReserve'),
      value: reservePrice
        ? t('auction.reserveDetail', {
            amount: formatCurrency(reservePrice),
            status: reserveMet ? t('auction.reserveMet') : t('auction.reserveNotMet'),
          })
        : t('auction.reserveDisabled'),
    },
    {
      key: 'extensions',
      label: t('auction.ruleExtensions'),
      value: antiSnipingEnabled
        ? t('auction.extensionDetail', {
            seconds: extensionSeconds ?? 0,
            current: currentExtensions ?? 0,
            max: maxExtensions ?? 0,
          })
        : t('auction.extensionDisabled'),
    },
    {
      key: 'restriction',
      label: t('auction.ruleRestriction'),
      value: culturalAssetRestricted
        ? t('auction.restrictionEnabled')
        : t('auction.restrictionDisabled'),
    },
  ];

  return (
    <View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.onSurface, marginBottom: 6 }}>
        {t('auction.storyTitle')}
      </Text>
      <Text style={{ fontSize: 14, color: Colors.slate600, lineHeight: 21 }}>
        {description || t('auction.storyFallback')}
      </Text>

      <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.onSurface, marginTop: 20, marginBottom: 2 }}>
        {t('auction.rulesTitle')}
      </Text>
      <View>
        {rows.map((row, idx) => (
          <View
            key={row.key}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              paddingVertical: 11,
              borderBottomWidth: idx === rows.length - 1 ? 0 : 1,
              borderBottomColor: Colors.slate100,
            }}
          >
            <Text style={{ fontSize: 14, color: Colors.slate500 }}>{row.label}</Text>
            <Text
              style={{ flex: 1, textAlign: 'right', fontSize: 14, fontWeight: '600', color: Colors.slate800 }}
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
