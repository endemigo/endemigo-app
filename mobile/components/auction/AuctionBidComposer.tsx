import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

import { Colors } from '../../constants/theme';
import { styles } from './AuctionBidComposer.styles';

type AuctionBidComposerProps = {
  bidAmount: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  minBidText: string;
  premiumTotalText: string;
  disabled: boolean;
  isPending: boolean;
  onSubmit: () => void;
  t: TFunction;
};

export function AuctionBidComposer({
  bidAmount,
  onChangeText,
  placeholder,
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

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{premiumTotalText}</Text>
        <Text style={styles.metaText}>{t('auction.bidComposerHint')}</Text>
      </View>
    </View>
  );
}
