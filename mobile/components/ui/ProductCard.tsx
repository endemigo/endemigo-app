import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getDefaultMobileExperienceConfig } from '@endemigo/shared';
import type { Product } from '@/types';
import { Colors } from '../../constants/theme';
import { useMobileConfig } from '../../hooks/useMobileConfig';
import { useAuthStore } from '../../store/authStore';
import { useRoleModeStore } from '../../store/roleModeStore';
import {
  getAudienceScopedProductCardConfig,
  resolveLocalizedText,
  resolveMobileAudience,
} from '../../utils/mobileConfig';
import { getProductImageUri } from '../../utils/productImages';
import { formatCurrency } from '../../utils/transactionFormatters';
import { styles } from './ProductCard.styles';

const SQUARE_PLACEHOLDER = 'https://placehold.co/148x148/F8F9FA/0097D8?text=Endemigo';
const GRID_PLACEHOLDER = 'https://placehold.co/200x200/F8F9FA/0097D8?text=Endemigo';
const GEO_BADGE_LOGOS = {
  PDO: require('../../assets/images/geo-indications/pdo.png'),
  PGI: require('../../assets/images/geo-indications/pgi.png'),
  TSG: require('../../assets/images/geo-indications/tsg.png'),
} as const;

interface Props {
  item: Product;
  onPress: () => void;
  /** variant: 'grid' (2-col, default) | 'square' (1-row horizontal) */
  variant?: 'grid' | 'square';
}

/**
 * ProductCard — ürün kartı, iki farklı variant destekler:
 *  - 'grid'   : ana sayfadaki 2 sütunlu grid için
 *  - 'square' : kategori satırlarındaki kare kart için
 */
export function ProductCard({ item, onPress, variant = 'grid' }: Props) {
  const { t, i18n } = useTranslation();
  const { data: mobileConfigData } = useMobileConfig();
  const user = useAuthStore((state) => state.user);
  const activeMode = useRoleModeStore((state) => state.activeMode);
  const mobileConfig = mobileConfigData ?? getDefaultMobileExperienceConfig();
  const locale = i18n.language.startsWith('en') ? 'en' : 'tr';
  const audience = resolveMobileAudience(user, activeMode);
  const productCardConfig = getAudienceScopedProductCardConfig(
    mobileConfig.cards.productCard,
    audience,
  );
  const productBadge = resolveLocalizedText(productCardConfig.badge, locale, '');
  const productCtaLabel = resolveLocalizedText(productCardConfig.ctaLabel, locale, t('common.ok'));
  const isAskPrice = Boolean(item.askPriceEnabled);
  const hasGeoIndication = Boolean(item.geoIndicationCertNo || item.geoIndicationRegion);
  const resolvedGeoTypes = item.geoIndicationTypes?.length
    ? item.geoIndicationTypes
    : item.geoIndicationType
      ? [item.geoIndicationType]
      : [];
  const geoBadgeLogos = resolvedGeoTypes
    .map((type) => GEO_BADGE_LOGOS[type])
    .filter(Boolean)
    .slice(0, 3);

  if (variant === 'square') {
    return (
      <TouchableOpacity style={styles.squareCard} onPress={onPress} activeOpacity={0.75}>
        <View style={styles.squareImageContainer}>
          <Image
            source={{
              uri: getProductImageUri(item, SQUARE_PLACEHOLDER),
            }}
            style={styles.squareImage}
            resizeMode="cover"
          />
          {hasGeoIndication ? (
            geoBadgeLogos.length > 0 ? (
              <View style={styles.geoBadgeLogosRow}>
                {geoBadgeLogos.map((logo, index) => (
                  <Image key={`geo-square-${index}`} source={logo} style={styles.geoBadgeLogo} resizeMode="contain" />
                ))}
              </View>
            ) : (
              <View style={styles.geoBadge}>
                <Ionicons name="ribbon" size={12} color={Colors.white} />
                <Text style={styles.geoBadgeText}>{t('product.geoIndicationBadge')}</Text>
              </View>
            )
          ) : null}
        </View>
        <View style={styles.squareBody}>
          {productBadge ? <Text style={styles.squareBadge}>{productBadge}</Text> : null}
          <Text style={styles.squareTitle} numberOfLines={2}>{item.title}</Text>
          {isAskPrice ? (
            <View style={styles.squareAskPriceBadge}>
              <Ionicons name="chatbubble-ellipses" size={12} color={Colors.primary} />
              <Text style={styles.squareAskPriceText}>
                {productCardConfig.showAskPriceBadge ? t('product.askPrice') : productCtaLabel}
              </Text>
            </View>
          ) : productCardConfig.showPrice ? (
            <Text style={styles.squarePrice}>{formatCurrency(item.price)}</Text>
          ) : (
            <Text style={styles.squareCtaHint}>{productCtaLabel}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.gridCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.gridImageContainer}>
        <Image
          source={{
            uri: getProductImageUri(item, GRID_PLACEHOLDER),
          }}
          style={styles.gridImage}
          resizeMode="cover"
        />
        {hasGeoIndication ? (
          geoBadgeLogos.length > 0 ? (
            <View style={styles.geoBadgeLogosRow}>
              {geoBadgeLogos.map((logo, index) => (
                <Image key={`geo-grid-${index}`} source={logo} style={styles.geoBadgeLogo} resizeMode="contain" />
              ))}
            </View>
          ) : (
            <View style={styles.geoBadge}>
              <Ionicons name="ribbon" size={12} color={Colors.white} />
              <Text style={styles.geoBadgeText}>{t('product.geoIndicationBadge')}</Text>
            </View>
          )
        ) : null}
      </View>
      <View style={styles.gridBody}>
        {productBadge ? <Text style={styles.gridBadge}>{productBadge}</Text> : null}
        <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
        {productCardConfig.showCategory && item.categoryName && (
          <Text style={styles.gridCategory}>{item.categoryName}</Text>
        )}
        <View style={styles.gridFooter}>
          {isAskPrice ? (
            <View style={styles.gridAskPriceButton}>
              <Ionicons name="chatbubble-ellipses" size={14} color={Colors.white} />
              <Text style={styles.gridAskPriceText}>
                {productCardConfig.showAskPriceBadge ? t('product.askPrice') : productCtaLabel}
              </Text>
            </View>
          ) : productCardConfig.showPrice ? (
            <>
              <Text style={styles.gridPrice}>
                {formatCurrency(item.price)}
              </Text>
              <Text style={styles.gridCtaHint}>{productCtaLabel}</Text>
            </>
          ) : (
            <Text style={styles.gridCtaHint}>{productCtaLabel}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
