import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius } from '../../constants/theme';
import { styles } from '../../styles/tabs/cart.styles';

export default function CartScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.emptyState}>
        <View style={styles.iconCircle}>
          <Ionicons name="cart-outline" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.title}>{t('cart.empty')}</Text>
        <Text style={styles.subtitle}>{t('cart.emptySub')}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(tabs)')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{t('cart.startShopping')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
