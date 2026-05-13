import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ProductCreateWizardStep } from '../../../types/productCreate.ts';
import { PRODUCT_CREATE_LISTING_TYPES, type ProductCreateListingType } from '../../../types/productCreate.ts';
import { styles } from './ProductCreateProgress.styles';

interface ProductCreateProgressProps {
  currentStep: ProductCreateWizardStep;
  totalSteps: number;
  titleKey: string;
  listingType: ProductCreateListingType;
}

export function ProductCreateProgress({
  currentStep,
  totalSteps,
  titleKey,
  listingType,
}: ProductCreateProgressProps) {
  const { t } = useTranslation();
  const isAuction = listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION;

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.stepTitle}>{t(titleKey)}</Text>
        <Text style={[styles.stepCounter, isAuction && styles.stepCounterAuction]}>
          {t('listing.stepCounter', { current: currentStep, total: totalSteps })}
        </Text>
      </View>
      <View style={styles.trackRow}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <View
            key={`product-create-step-${index + 1}`}
            style={[
              styles.trackItem,
              index < currentStep && styles.trackItemActive,
              index < currentStep && isAuction && styles.trackItemActiveAuction,
            ]}
          />
        ))}
      </View>
    </View>
  );
}
