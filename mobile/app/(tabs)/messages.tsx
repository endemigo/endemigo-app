import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { NegotiationListItem } from '../../components/negotiation';
import { Colors } from '../../constants/theme';
import { useNegotiations } from '../../hooks/useNegotiations';
import { styles } from '../../styles/tabs/messages.styles';

export default function MessagesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: negotiations = [], isLoading, refetch, isRefetching } = useNegotiations();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.centerText}>{t('negotiation.list.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('negotiation.list.title')}</Text>
          <Text style={styles.subtitle}>{t('negotiation.list.subtitle')}</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => refetch()}
          activeOpacity={0.8}
          disabled={isRefetching}
        >
          <Ionicons name="refresh" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {negotiations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="chatbubble-ellipses-outline" size={42} color={Colors.primary} />
          <Text style={styles.emptyTitle}>{t('negotiation.list.emptyTitle')}</Text>
          <Text style={styles.emptyText}>{t('negotiation.list.emptyText')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {negotiations.map((negotiation) => (
            <NegotiationListItem
              key={negotiation.id}
              negotiation={negotiation}
              onPress={() => router.push(`/negotiation/${negotiation.id}` as never)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
