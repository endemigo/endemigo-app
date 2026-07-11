import React, { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

import { Colors } from '../../constants/theme';
import { FullscreenImageViewer } from '../ui/FullscreenImageViewer';
import type { ProductImage } from '../../types';
import { styles } from './AuctionHero.styles';

type AuctionHeroProps = {
  imageUri: string;
  // Ürün galerisi; verilirse tam ekranda tüm görseller kaydırılır.
  galleryImages?: ProductImage[];
  title: string;
  lotNumber?: string;
  sellerName?: string | null;
  categoryName?: string;
  statusLabel: string;
  isActive: boolean;
  isEnded: boolean;
  viewerCount: number;
  isConnected: boolean;
  auctionType?: string;
  auctionTypeLabel: string;
  onBack: () => void;
  t: TFunction;
};

export function AuctionHero({
  imageUri,
  galleryImages,
  title,
  lotNumber,
  sellerName,
  categoryName,
  statusLabel,
  isActive,
  isEnded,
  viewerCount,
  isConnected,
  auctionType,
  auctionTypeLabel,
  onBack,
  t,
}: AuctionHeroProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const fullscreenImages = galleryImages?.length
    ? [...galleryImages].sort((a, b) => a.sortOrder - b.sortOrder).map((img) => img.url)
    : [imageUri];
  const showAuctionTypeChip = !(isEnded && auctionType === 'REALTIME');
  const statusTone = isActive
    ? styles.statusBadgeActive
    : isEnded
      ? styles.statusBadgeEnded
      : styles.statusBadgeScheduled;

  return (
    <View style={styles.heroCard}>
      <TouchableOpacity
        style={styles.heroImage}
        activeOpacity={0.9}
        onPress={() => setViewerOpen(true)}
      >
        <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
      </TouchableOpacity>
      <View style={styles.overlay} pointerEvents="none" />

      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        activeOpacity={0.85}
      >
        <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
      </TouchableOpacity>

      <View style={styles.topMetaRow}>
        <View style={styles.topMetaGroup}>
          <View style={[styles.statusBadge, statusTone]}>
            {isActive ? <View style={styles.liveDot} /> : null}
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>
        <View style={styles.audienceBadge}>
          <Ionicons name="eye" size={14} color={Colors.white} />
          <Text style={styles.audienceText}>
            {t('auction.viewersLabel', { count: viewerCount })}
          </Text>
          {!isEnded ? (
            <View
              style={[
                styles.audienceDot,
                isConnected ? styles.audienceDotLive : styles.audienceDotOffline,
              ]}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.heroContent}>
        <View style={styles.chipRow}>
          {categoryName ? (
            <View style={styles.chip}>
              <Ionicons name="pricetag" size={14} color={Colors.white} />
              <Text style={styles.chipText}>{categoryName}</Text>
            </View>
          ) : null}
          {showAuctionTypeChip ? (
            <View style={styles.chip}>
              <Ionicons name="time" size={14} color={Colors.white} />
              <Text style={styles.chipText}>{auctionTypeLabel}</Text>
            </View>
          ) : null}
        </View>

        {lotNumber ? <Text style={styles.lotNumber}>{lotNumber}</Text> : null}
        <Text style={styles.title}>{title}</Text>

        <View style={styles.sellerRow}>
          <View style={styles.sellerPill}>
            <Ionicons name="storefront" size={16} color={Colors.primary} />
            <View>
              <Text style={styles.sellerLabel}>{t('auction.heroSellerLabel')}</Text>
              <Text style={styles.sellerValue}>
                {sellerName || t('product.unknownSeller')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <FullscreenImageViewer
        visible={viewerOpen}
        images={fullscreenImages}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}
