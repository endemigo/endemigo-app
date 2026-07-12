import React, { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

import { Colors } from '../../constants/theme';
import { styles } from './AuctionBidComposer.styles';

function formatMasked(value: string): string {
  const clean = value.replace(/\D/g, '');
  if (!clean) return '';
  return parseInt(clean, 10).toLocaleString('tr-TR');
}

type AuctionBidComposerProps = {
  bidAmount: string;
  maxBidAmount: string;
  quickBidOptions: { key: string; label: string; amount: string }[];
  feeEstimateRows: {
    key: string;
    label: string;
    value: string;
    tone?: 'default' | 'accent' | 'error';
  }[];
  statusMessage?: string | null;
  proxyMessage?: string | null;
  walletGateMessage?: string | null;
  validationError?: string | null;
  onChangeText: (value: string) => void;
  onChangeMaxBidText: (value: string) => void;
  onSelectQuickBid: (amount: string) => void;
  placeholder: string;
  maxPlaceholder: string;
  minBidText: string;
  disabled: boolean;
  isPending: boolean;
  onSubmit: () => void;
  onClose?: () => void;
  t: TFunction;
  lotTitle?: string | null;
  lotNumber?: string | number | null;
  isPreBid?: boolean;
};

export function AuctionBidComposer({
  bidAmount,
  maxBidAmount,
  quickBidOptions,
  feeEstimateRows,
  statusMessage,
  proxyMessage,
  walletGateMessage,
  validationError,
  onChangeText,
  onChangeMaxBidText,
  onSelectQuickBid,
  placeholder,
  maxPlaceholder,
  minBidText,
  disabled,
  isPending,
  onSubmit,
  onClose,
  t,
  lotTitle,
  lotNumber,
  isPreBid = false,
}: AuctionBidComposerProps) {
  const [isMaxFocused, setIsMaxFocused] = useState(false);

  return (
    <View style={styles.shell}>
      {/* Header Section */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          {lotNumber ? (
            <View style={styles.lotBadge}>
              <Ionicons name="pricetag-outline" size={10} color={Colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.lotBadgeText}>Lot #{lotNumber}</Text>
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={2}>
            {lotTitle || t('auction.placeBid')}
          </Text>
          <Text style={styles.minBidLabel}>
            {minBidText}
          </Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={24} color={Colors.slate400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Bid / Starting Bid Input */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          {isPreBid
            ? t('auction.startBidAmountLabel', 'Başlangıç Teklif Tutarı (Sabit)')
            : t('auction.bidAmountLabel', 'Teklif Tutarı')}
        </Text>
        <View
          style={[
            styles.mainInputShell,
            validationError ? styles.inputErrorBorder : null,
            isPreBid && styles.mainInputShellDisabled,
          ]}
        >
          <Text
            style={[
              styles.mainCurrency,
              validationError ? { color: Colors.error } : null,
              isPreBid && { color: Colors.slate400 },
            ]}
          >
            ₺
          </Text>
          <TextInput
            style={[styles.mainInput, isPreBid && { color: Colors.slate400 }]}
            value={formatMasked(bidAmount)}
            onChangeText={(text) => onChangeText(text.replace(/\D/g, ''))}
            keyboardType="numeric"
            placeholder={formatMasked(placeholder)}
            placeholderTextColor={Colors.slate400}
            editable={!isPreBid}
          />
          {isPreBid && (
            <Ionicons name="lock-closed" size={16} color={Colors.slate400} style={{ marginLeft: 8 }} />
          )}
        </View>
        {validationError ? (
          <Text style={styles.errorText}>{validationError}</Text>
        ) : null}
      </View>

      {/* Quick Bid Options */}
      {!isPreBid && (
        <View style={styles.quickBidRow}>
          {quickBidOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={styles.quickBidChip}
              onPress={() => onSelectQuickBid(option.amount)}
              activeOpacity={0.8}
            >
              <Text style={styles.quickBidChipText}>
                {option.key === 'min' ? t('auction.quickBidMinLabel', 'Min') : option.key === 'plusOne' ? '+1 Artış' : '+3 Artış'}
              </Text>
              <Text style={styles.quickBidChipValue}>
                ₺{formatMasked(option.amount)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Optional Auto Bid (Max Bid) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          {t('auction.maxBidLabel', 'Maksimum Teklif Limiti (Otomatik Teklif)')}
        </Text>
        <View style={[styles.subInputShell, isMaxFocused && styles.subInputShellFocused]}>
          <Text style={[styles.subCurrency, isMaxFocused && { color: Colors.primary }]}>₺</Text>
          <TextInput
            style={styles.subInput}
            value={formatMasked(maxBidAmount)}
            onChangeText={(text) => onChangeMaxBidText(text.replace(/\D/g, ''))}
            keyboardType="numeric"
            placeholder={maxPlaceholder}
            placeholderTextColor={Colors.slate400}
            onFocus={() => setIsMaxFocused(true)}
            onBlur={() => setIsMaxFocused(false)}
          />
        </View>
      </View>

      {/* Premium Info Banner (Shown when Max Bid input is focused) */}
      {isMaxFocused && (
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.infoCardText}>
            {t('auction.maxBidHint', 'Sistem sizin adınıza maksimum teklif sınırınıza kadar otomatik artırır.')}
          </Text>
        </View>
      )}

      {/* Status / Warnings */}
      {statusMessage || proxyMessage ? (
        <View style={styles.stateCard}>
          {statusMessage ? <Text style={styles.stateTitle}>{statusMessage}</Text> : null}
          {proxyMessage ? <Text style={styles.stateBody}>{proxyMessage}</Text> : null}
        </View>
      ) : null}

      {walletGateMessage ? (
        <View style={styles.walletGateCard}>
          <Ionicons name="wallet-outline" size={18} color={Colors.error} />
          <Text style={styles.walletGateText}>{walletGateMessage}</Text>
        </View>
      ) : null}

      {/* Fee Estimate List */}
      <View style={styles.feeEstimatesContainer}>
        {feeEstimateRows.map((row, index) => {
          const isTotal = row.key === 'total';
          return (
            <View
              key={row.key}
              style={[
                styles.feeRow,
                isTotal && styles.feeRowTotal,
                index > 0 && !isTotal && styles.feeRowBorder
              ]}
            >
              <Text style={[styles.feeLabel, isTotal && styles.feeLabelTotal]}>{row.label}</Text>
              <Text
                style={[
                  styles.feeValue,
                  isTotal && styles.feeValueTotal,
                  row.tone === 'accent' && styles.feeValueAccent,
                  row.tone === 'error' && styles.feeValueError,
                ]}
              >
                {row.value}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
        onPress={onSubmit}
        disabled={disabled}
        activeOpacity={0.85}
      >
        {isPending ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Ionicons name="hammer-sharp" size={18} color={Colors.white} />
            <Text style={styles.actionButtonText}>
              {isPreBid
                ? t('auction.submitPreBidCta', 'Ön Teklifi Onayla')
                : t('auction.submitBidCta', 'Teklifi Onayla ve Gönder')}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.footerHint}>
        {t('auction.bidComposerHintShort', 'Teklif verdiğinizde tutar bakiyenizden bloke edilir.')}
      </Text>
    </View>
  );
}
