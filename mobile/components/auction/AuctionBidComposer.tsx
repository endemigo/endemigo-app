import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

import { Colors } from '../../constants/theme';
import { styles } from './AuctionBidComposer.styles';

type AuctionBidComposerProps = {
  bidAmount: string;
  maxBidAmount: string;
  quickBidOptions: Array<{ key: string; label: string; amount: string }>;
  statusMessage?: string | null;
  proxyMessage?: string | null;
  onChangeText: (value: string) => void;
  onChangeMaxBidText: (value: string) => void;
  onSelectQuickBid: (amount: string) => void;
  placeholder: string;
  maxPlaceholder: string;
  minBidText: string;
  premiumTotalText: string;
  disabled: boolean;
  isPending: boolean;
  onSubmit: () => void;
  t: TFunction;
};

export function AuctionBidComposer({
  bidAmount,
  maxBidAmount,
  quickBidOptions,
  statusMessage,
  proxyMessage,
  onChangeText,
  onChangeMaxBidText,
  onSelectQuickBid,
  placeholder,
  maxPlaceholder,
  minBidText,
  premiumTotalText,
  disabled,
  isPending,
  onSubmit,
  t,
}: AuctionBidComposerProps) {
  return (
    <View style={styles.shell}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{t('auction.placeBid')}</Text>
          <Text style={styles.subtitle}>{t('auction.stickyBidSubtitle')}</Text>
        </View>
        <Text style={styles.priceHint}>{minBidText}</Text>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.inputShell}>
          <Text style={styles.currency}>₺</Text>
          <TextInput
            style={styles.input}
            value={bidAmount}
            onChangeText={onChangeText}
            keyboardType="numeric"
            placeholder={placeholder}
            placeholderTextColor={Colors.slate400}
          />
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.inputShell}>
          <Text style={styles.currency}>₺</Text>
          <TextInput
            style={styles.input}
            value={maxBidAmount}
            onChangeText={onChangeMaxBidText}
            keyboardType="numeric"
            placeholder={maxPlaceholder}
            placeholderTextColor={Colors.slate400}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, disabled && styles.submitButtonDisabled]}
          onPress={onSubmit}
          disabled={disabled}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="hammer" size={18} color={Colors.white} />
              <Text style={styles.submitButtonText}>{t('auction.bidButton')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.quickBidRow}>
        {quickBidOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={styles.quickBidChip}
            onPress={() => onSelectQuickBid(option.amount)}
            activeOpacity={0.85}
          >
            <Text style={styles.quickBidChipText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {statusMessage || proxyMessage ? (
        <View style={styles.stateCard}>
          {statusMessage ? (
            <Text style={styles.stateTitle}>{statusMessage}</Text>
          ) : null}
          {proxyMessage ? (
            <Text style={styles.stateBody}>{proxyMessage}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{premiumTotalText}</Text>
        <Text style={styles.metaText}>{t('auction.maxBidHint')}</Text>
      </View>
    </View>
  );
}
