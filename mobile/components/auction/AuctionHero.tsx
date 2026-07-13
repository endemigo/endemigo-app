import React, { useEffect, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/ui/AppIcon';
import type { TFunction } from 'i18next';

import { Colors } from '../../constants/theme';
import { FullscreenImageViewer } from '../ui/FullscreenImageViewer';
import type { ProductImage } from '../../types';

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
  // Yakında başlayan müzayedelerde başlama sayacı gösterilir.
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

const circleBtn = {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: Colors.slate50,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

// Minimal / sade lot başlığı: koyu tam-ekran hero yerine beyaz üst bar + görsel
// beyaz zeminde, başlık görselin altında siyah. LiveAuctioneers benzeri ferah his.
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
  onBack,
  onShare,
  onToggleFavorite,
  isFavorited,
  t,
}: AuctionHeroProps) {
  const insets = useSafeAreaInsets();
  const [viewerOpen, setViewerOpen] = useState(false);

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
      // Sayaç bittiğinde "00:00" takılmasın: boş bırak → durum etiketi gösterilir.
      if (diff === 0) {
        setStartCountdown('');
        onStartExpired?.();
        return;
      }
      const total = Math.floor(diff / 1000);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      setStartCountdown(h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [showStartCountdown, startTime, serverTime, onStartExpired]);

  const fullscreenImages = galleryImages?.length
    ? [...galleryImages].sort((a, b) => a.sortOrder - b.sortOrder).map((img) => img.url)
    : [imageUri];

  const statusText = showStartCountdown && startCountdown
    ? `${t('auction.startCountdownPrefix')}: ${startCountdown}`
    : statusLabel;
  const statusColor = isActive ? Colors.auctionGreen : isEnded ? Colors.slate400 : Colors.primary;

  return (
    <View style={{ backgroundColor: Colors.white, paddingTop: insets.top }}>
      {/* Üst bar — beyaz */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        <TouchableOpacity style={circleBtn} onPress={onBack} activeOpacity={0.8}>
          <AppIcon name="chevron-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {onShare ? (
            <TouchableOpacity style={circleBtn} onPress={onShare} activeOpacity={0.8}>
              <AppIcon name="share-outline" size={19} color={Colors.onSurface} />
            </TouchableOpacity>
          ) : null}
          {onToggleFavorite ? (
            <TouchableOpacity style={circleBtn} onPress={onToggleFavorite} activeOpacity={0.8}>
              <AppIcon
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={19}
                color={isFavorited ? Colors.accent : Colors.onSurface}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Görsel — beyaz zeminde, yuvarlak köşe */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setViewerOpen(true)}
        style={{
          marginHorizontal: 16,
          height: 230,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: Colors.slate50,
        }}
      >
        <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        <View
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            backgroundColor: 'rgba(0,0,0,0.55)',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 6,
          }}
        >
          <Text style={{ color: Colors.white, fontSize: 11, fontWeight: '700' }}>
            {`1 / ${fullscreenImages.length}`}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Başlık + künye — görselin altında, siyah */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        {lotNumber ? (
          <Text style={{ fontSize: 12, color: Colors.slate400, letterSpacing: 0.5, marginBottom: 4 }}>
            {lotNumber}
          </Text>
        ) : null}
        <Text style={{ fontSize: 22, fontWeight: '700', color: Colors.onSurface, lineHeight: 28 }}>
          {title}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 8, gap: 4 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: statusColor }} />
          <Text style={{ fontSize: 13, color: statusColor, fontWeight: '600' }}>{statusText}</Text>
          {categoryName ? (
            <Text style={{ fontSize: 13, color: Colors.slate400 }}> · {categoryName}</Text>
          ) : null}
          {viewerCount > 0 ? (
            <Text style={{ fontSize: 13, color: Colors.slate400 }}>
              {' · '}
              {t('auction.viewersLabel', { count: viewerCount })}
            </Text>
          ) : null}
        </View>

        <Text style={{ fontSize: 13, color: Colors.slate500, marginTop: 6 }}>
          {t('auction.heroSellerLabel')}: {sellerName || t('product.unknownSeller')}
        </Text>
      </View>

      <FullscreenImageViewer
        visible={viewerOpen}
        images={fullscreenImages}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}
