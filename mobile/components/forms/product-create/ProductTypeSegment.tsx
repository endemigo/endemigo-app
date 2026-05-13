import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  PRODUCT_CREATE_LISTING_TYPES,
  type ProductCreateListingType,
} from '../../../types/productCreate.ts';
import { styles } from './ProductTypeSegment.styles';

interface ProductTypeSegmentProps {
  value: ProductCreateListingType;
  onChange: (value: ProductCreateListingType) => void;
}

export function ProductTypeSegment({ value, onChange }: ProductTypeSegmentProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.option,
          value === PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE && styles.optionActive,
          value === PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE && styles.optionActiveDirectSale,
        ]}
        onPress={() => onChange(PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE)}
      >
        <Text
          style={[
            styles.optionLabel,
            value === PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE && styles.optionLabelActive,
            value === PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE && styles.optionLabelActiveDirectSale,
          ]}
        >
          {t('listing.directSale')}
        </Text>
        <Text style={styles.optionHint}>{t('listing.directSaleHint')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.option,
          value === PRODUCT_CREATE_LISTING_TYPES.AUCTION && styles.optionActive,
          value === PRODUCT_CREATE_LISTING_TYPES.AUCTION && styles.optionActiveAuction,
        ]}
        onPress={() => onChange(PRODUCT_CREATE_LISTING_TYPES.AUCTION)}
      >
        <Text
          style={[
            styles.optionLabel,
            value === PRODUCT_CREATE_LISTING_TYPES.AUCTION && styles.optionLabelActive,
            value === PRODUCT_CREATE_LISTING_TYPES.AUCTION && styles.optionLabelActiveAuction,
          ]}
        >
          {t('listing.auction')}
        </Text>
        <Text style={styles.optionHint}>{t('listing.auctionHint')}</Text>
      </TouchableOpacity>
    </View>
  );
}
