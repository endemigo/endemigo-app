import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { styles } from '../../styles/legal/[slug].styles';

type LegalSlug = 'privacy' | 'distance-sales' | 'return-policy';

const LEGAL_KEYS: Record<
  LegalSlug,
  {
    title: string;
    summary: string;
    sections: Array<{ title: string; paragraphs: string[] }>;
  }
> = {
  privacy: {
    title: 'legal.privacy.title',
    summary: 'legal.privacy.summary',
    sections: [
      {
        title: 'legal.privacy.sections.collection.title',
        paragraphs: [
          'legal.privacy.sections.collection.body1',
          'legal.privacy.sections.collection.body2',
        ],
      },
      {
        title: 'legal.privacy.sections.processing.title',
        paragraphs: [
          'legal.privacy.sections.processing.body1',
          'legal.privacy.sections.processing.body2',
        ],
      },
      {
        title: 'legal.privacy.sections.retention.title',
        paragraphs: [
          'legal.privacy.sections.retention.body1',
          'legal.privacy.sections.retention.body2',
        ],
      },
    ],
  },
  'distance-sales': {
    title: 'legal.distanceSales.title',
    summary: 'legal.distanceSales.summary',
    sections: [
      {
        title: 'legal.distanceSales.sections.scope.title',
        paragraphs: [
          'legal.distanceSales.sections.scope.body1',
          'legal.distanceSales.sections.scope.body2',
        ],
      },
      {
        title: 'legal.distanceSales.sections.delivery.title',
        paragraphs: [
          'legal.distanceSales.sections.delivery.body1',
          'legal.distanceSales.sections.delivery.body2',
        ],
      },
      {
        title: 'legal.distanceSales.sections.support.title',
        paragraphs: [
          'legal.distanceSales.sections.support.body1',
          'legal.distanceSales.sections.support.body2',
        ],
      },
    ],
  },
  'return-policy': {
    title: 'legal.returnPolicy.title',
    summary: 'legal.returnPolicy.summary',
    sections: [
      {
        title: 'legal.returnPolicy.sections.eligibility.title',
        paragraphs: [
          'legal.returnPolicy.sections.eligibility.body1',
          'legal.returnPolicy.sections.eligibility.body2',
        ],
      },
      {
        title: 'legal.returnPolicy.sections.logistics.title',
        paragraphs: [
          'legal.returnPolicy.sections.logistics.body1',
          'legal.returnPolicy.sections.logistics.body2',
        ],
      },
      {
        title: 'legal.returnPolicy.sections.refund.title',
        paragraphs: [
          'legal.returnPolicy.sections.refund.body1',
          'legal.returnPolicy.sections.refund.body2',
        ],
      },
    ],
  },
};

function isLegalSlug(value: string): value is LegalSlug {
  return value === 'privacy' || value === 'distance-sales' || value === 'return-policy';
}

export default function LegalDocumentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const safeSlug = slug && isLegalSlug(slug) ? slug : 'privacy';
  const document = LEGAL_KEYS[safeSlug];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('legal.headerTitle')}</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>{t('legal.eyebrow')}</Text>
        <Text style={styles.title}>{t(document.title)}</Text>
        <Text style={styles.summary}>{t(document.summary)}</Text>
      </View>

      {document.sections.map((section) => (
        <View key={section.title} style={styles.card}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t(section.title)}</Text>
            {section.paragraphs.map((paragraphKey) => (
              <Text key={paragraphKey} style={styles.paragraph}>
                {t(paragraphKey)}
              </Text>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
