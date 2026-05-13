import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

import { Colors } from '../../constants/theme';
import { formatCurrency } from '../../utils/transactionFormatters';
import { styles } from './AuctionRulesPanel.styles';

type AuctionRulesPanelProps = {
  sellerName?: string | null;
  categoryName?: string;
  conditionLabel: string;
  description?: string;
  auctionTypeLabel: string;
  minIncrement: number;
  antiSnipingEnabled?: boolean;
  extensionSeconds?: number;
  currentExtensions?: number;
  maxExtensions?: number;
  culturalAssetRestricted?: boolean;
  t: TFunction;
};

export function AuctionRulesPanel({
  sellerName,
  categoryName,
  conditionLabel,
  description,
  auctionTypeLabel,
  minIncrement,
  antiSnipingEnabled,
  extensionSeconds,
  currentExtensions,
  maxExtensions,
  culturalAssetRestricted,
  t,
}: AuctionRulesPanelProps) {
  const rules = [
    {
      icon: 'time-outline' as const,
      title: t('auction.ruleAuctionType'),
      body: auctionTypeLabel,
    },
    {
      icon: 'trending-up-outline' as const,
      title: t('auction.ruleIncrement'),
      body: formatCurrency(minIncrement),
    },
    {
      icon: 'refresh-circle-outline' as const,
      title: t('auction.ruleExtensions'),
      body: antiSnipingEnabled
        ? t('auction.extensionDetail', {
            seconds: extensionSeconds ?? 0,
            current: currentExtensions ?? 0,
            max: maxExtensions ?? 0,
          })
        : t('auction.extensionDisabled'),
    },
    {
      icon: 'alert-circle-outline' as const,
      title: t('auction.ruleRestriction'),
      body: culturalAssetRestricted
        ? t('auction.restrictionEnabled')
        : t('auction.restrictionDisabled'),
    },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('auction.storyTitle')}</Text>
        <Text style={styles.sectionBody}>{t('auction.storySubtitle')}</Text>
      </View>

      <View style={styles.storyCard}>
        <Text style={styles.description}>
          {description || t('auction.storyFallback')}
        </Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>{t('auction.heroSellerLabel')}</Text>
            <Text style={styles.metaValue}>
              {sellerName || t('product.unknownSeller')}
            </Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>{t('auction.categoryLabel')}</Text>
            <Text style={styles.metaValue}>
              {categoryName || t('auction.categoryFallback')}
            </Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>{t('auction.conditionLabel')}</Text>
            <Text style={styles.metaValue}>{conditionLabel}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>{t('auction.ruleAuctionType')}</Text>
            <Text style={styles.metaValue}>{auctionTypeLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('auction.rulesTitle')}</Text>
        <Text style={styles.sectionBody}>{t('auction.rulesSubtitle')}</Text>
      </View>

      <View style={styles.rulesGrid}>
        {rules.map((rule) => (
          <View key={rule.title} style={styles.ruleCard}>
            <View style={styles.ruleIconWrap}>
              <Ionicons name={rule.icon} size={18} color={Colors.primary} />
            </View>
            <Text style={styles.ruleTitle}>{rule.title}</Text>
            <Text style={styles.ruleBody}>{rule.body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
