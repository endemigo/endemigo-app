import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Tabs } from 'expo-router';
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
      <Tabs.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 16, padding: 8 }}
              onPress={() => refetch()}
              activeOpacity={0.7}
              disabled={isRefetching}
            >
              {isRefetching ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="refresh" size={22} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ),
        }}
      />

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
