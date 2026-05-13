import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { styles } from './SellerQuickActions.styles';

export interface SellerQuickActionItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface SellerQuickActionsProps {
  actions: SellerQuickActionItem[];
}

export function SellerQuickActions({ actions }: SellerQuickActionsProps) {
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.key}
          style={styles.card}
          onPress={action.onPress}
          activeOpacity={0.82}
        >
          <View style={styles.iconBox}>
            <Ionicons name={action.icon} size={18} color={Colors.primary} />
          </View>
          <Text style={styles.label}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
