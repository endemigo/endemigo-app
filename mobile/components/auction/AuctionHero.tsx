import React, { useEffect, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon } from '@/components/ui/AppIcon';
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
  // Yakında başlayan müzayedelerde badge içinde başlama sayacı gösterilir.
  isUpcoming?: boolean;
  startTime?: string;
  serverTime?: string;
  onStartExpired?: () => void;
  viewerCount: number;
  isConnected: boolean;
  auctionType?: string;
  auctionTypeLabel: string;
  onBack: () => void;
  // Üst-sağ aksiyonlar: paylaş + favori. Handler verilmezse ilgili buton gizlenir.
  onShare?: () => void;
  onToggleFavorite?: () => void;
  isFavorited?: boolean;
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
  isUpcoming,
  startTime,
  serverTime,
  onStartExpired,
  viewerCount,
  isConnected,
  auctionType,
  auctionTypeLabel,
  onBack,
  onShare,
  onToggleFavorite,
  isFavorited,
  t,
}: AuctionHeroProps) {
  const [viewerOpen, setViewerOpen] = useState(false);

  // Başlama sayacı: "Yakında Başlıyor" statik etiketi yerine canlı geri sayım.
  const showStartCountdown = !!(isUpcoming && startTime && !isActive && !isEnded);
  const [startCountdown, setStartCountdown] = useState('');
  useEffect(() => {
    if (!showStartCountdown || !startTime) {
      setStartCountdown('');
      return;
    }
    const offset = serverTime ? new Date(serverTime).getTime() - Date.now() : 0;
    const pad = (n: number) => String(n).padStart(2, '0');
    const tick = () => {
      const diff = Math.max(0, new Date(startTime).getTime() - (Date.now() + offset));
      const total = Math.floor(diff / 1000);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      setStartCountdown(h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`);
      if (diff === 0) onStartExpired?.();
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [showStartCountdown, startTime, serverTime, onStartExpired]);
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
        <AppIcon name="arrow-back" size={22} color={Colors.onSurface} />
      </TouchableOpacity>

      {(onShare || onToggleFavorite) ? (
        <View style={styles.topRightActions}>
          {onShare ? (
            <TouchableOpacity style={styles.heroActionButton} onPress={onShare} activeOpacity={0.85}>
              <AppIcon name="share-outline" size={20} color={Colors.onSurface} />
            </TouchableOpacity>
          ) : null}
          {onToggleFavorite ? (
            <TouchableOpacity style={styles.heroActionButton} onPress={onToggleFavorite} activeOpacity={0.85}>
              <AppIcon
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorited ? Colors.accent : Colors.onSurface}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <View style={styles.topMetaRow}>
        <View style={styles.topMetaGroup}>
          <View style={[styles.statusBadge, statusTone]}>
            {isActive ? <View style={styles.liveDot} /> : null}
            {showStartCountdown && startCountdown ? (
              <>
                <AppIcon name="time-outline" size={13} color={Colors.white} />
                <Text style={styles.statusText}>
                  {t('auction.startCountdownPrefix')}: {startCountdown}
                </Text>
              </>
            ) : (
              <Text style={styles.statusText}>{statusLabel}</Text>
            )}
          </View>
        </View>
        <View style={styles.audienceBadge}>
          <AppIcon name="eye" size={14} color={Colors.white} />
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
              <AppIcon name="pricetag" size={14} color={Colors.white} />
              <Text style={styles.chipText}>{categoryName}</Text>
            </View>
          ) : null}
          {showAuctionTypeChip ? (
            <View style={styles.chip}>
              <AppIcon name="time" size={14} color={Colors.white} />
              <Text style={styles.chipText}>{auctionTypeLabel}</Text>
            </View>
          ) : null}
        </View>

        {lotNumber ? <Text style={styles.lotNumber}>{lotNumber}</Text> : null}
        <Text style={styles.title}>{title}</Text>

        <View style={styles.sellerRow}>
          <View style={styles.sellerPill}>
            <AppIcon name="storefront" size={16} color={Colors.primary} />
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
