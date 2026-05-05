import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles } from './MembershipBenefitShowcase.styles';

export interface MembershipBenefitShowcaseProps {
  packageName: string;
  benefits: string[];
  sellerOnly: boolean;
  highlightedBenefit: string;
}

export function MembershipBenefitShowcase({
  packageName,
  benefits,
  sellerOnly,
  highlightedBenefit,
}: MembershipBenefitShowcaseProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{t('paketim.currentPackage')}</Text>
      <Text style={styles.title}>{packageName}</Text>
      {sellerOnly && <Text style={styles.sellerOnly}>{t('paketim.sellerOnlyNotice')}</Text>}
      {benefits.map((benefit) => {
        const isHighlighted = benefit === highlightedBenefit;
        return (
          <View
            key={benefit}
            style={[styles.benefit, isHighlighted && styles.benefitHighlighted]}
          >
            <Text style={styles.benefitText}>{benefit}</Text>
            {isHighlighted && (
              <Text style={styles.highlightedLabel}>{t('paketim.highlightedBenefit')}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
