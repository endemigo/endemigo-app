import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ProductCreateWizardStep } from '../../../types/productCreate.ts';
import { styles } from './ProductCreateProgress.styles';

interface ProductCreateProgressProps {
  currentStep: ProductCreateWizardStep;
  totalSteps: number;
  titleKey: string;
}

export function ProductCreateProgress({
  currentStep,
  totalSteps,
  titleKey,
}: ProductCreateProgressProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.stepTitle}>{t(titleKey)}</Text>
        <Text style={styles.stepCounter}>
          {t('listing.stepCounter', { current: currentStep, total: totalSteps })}
        </Text>
      </View>
      <View style={styles.trackRow}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <View
            key={`product-create-step-${index + 1}`}
            style={[styles.trackItem, index < currentStep && styles.trackItemActive]}
          />
        ))}
      </View>
    </View>
  );
}
