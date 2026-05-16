import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuctionStatus } from '@endemigo/shared';

import { useAuction, useAuctionBids, usePlaceBid, useWithdrawBid } from '../../hooks/useAuctions';
import { useAuctionSocket } from '../../hooks/useAuctionSocket';
import { useWalletBalance, useWalletHolds } from '../../hooks/useWallet';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import { resolveApiErrorMessage } from '../../utils/apiError';
import { formatAmount } from '../../utils/transactionFormatters';
import { Colors } from '../../constants/theme';
import { styles } from './_id.styles';
import { useProduct } from '../../hooks/useProducts';
import { getProductImageUri } from '../../utils/productImages';
import {
  getAuctionConditionLabel,
  getAuctionStatusLabel,
  getAuctionTypeLabel,
} from '../../utils/auctionPresentation';
import { AuctionHero } from '../../components/auction/AuctionHero';
import { AuctionSummaryPanel } from '../../components/auction/AuctionSummaryPanel';
import { AuctionRulesPanel } from '../../components/auction/AuctionRulesPanel';
import { AuctionBidHistory } from '../../components/auction/AuctionBidHistory';
import { AuctionBidComposer } from '../../components/auction/AuctionBidComposer';

export default function AuctionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { showModal } = useModalStore();
  const { data: auction, isLoading, refetch } = useAuction(id);
  const { data: bids, refetch: refetchBids } = useAuctionBids(id);
  const { data: wallet } = useWalletBalance();
  const { data: walletHolds = [] } = useWalletHolds();
  const placeBid = usePlaceBid();
  const withdrawBid = useWithdrawBid();
  const socket = useAuctionSocket(id);
  const { data: product } = useProduct(auction?.productId ?? '');
  const [bidAmount, setBidAmount] = useState('');

  const apiCurrentPrice = Number(auction?.currentPrice || 0);
  const socketCurrentPrice = Number(socket.currentPrice || 0);
  const currentPrice = Math.max(apiCurrentPrice, socketCurrentPrice);
  const bidCount = Math.max(auction?.bidCount || 0, socket.bidCount || 0);
  const endTime = socket.endTime || auction?.endTime || '';
  const serverTime = socket.serverTime || auction?.serverTime || '';

  useEffect(() => {
    if (socket.lastBid) {
      refetchBids();
    }
  }, [refetchBids, socket.lastBid]);

  useEffect(() => {
    if (socket.auctionEnded) {
      refetch();
      refetchBids();
    }
  }, [refetch, refetchBids, socket.auctionEnded]);

  useEffect(() => {
    if (auction?.minIncrement) {
      const nextBidAmount = currentPrice + Number(auction.minIncrement);
      setBidAmount(nextBidAmount.toString());
    }
  }, [auction?.minIncrement, currentPrice]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.auctionGreen} />
      </View>
    );
  }

  if (!auction) {
    return (
      <View style={styles.center}>
        <Text>{t('common.error')}</Text>
        <TouchableOpacity onPress={() => refetch()} activeOpacity={0.8}>
          <Text>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isEnded =
    auction.status === AuctionStatus.ENDED ||
    auction.status === AuctionStatus.COMPLETED ||
    socket.auctionEnded;
  const isActive = auction.status === AuctionStatus.ACTIVE && !isEnded;
  const isSeller = user?.id === auction.sellerId;
  const minBid = currentPrice + Number(auction.minIncrement);
  const parsedBidAmount = parseFloat(bidAmount);
  const isBidEmpty = bidAmount.trim().length === 0;
  const isBidBelowMinimum =
    !isBidEmpty && !Number.isNaN(parsedBidAmount) && parsedBidAmount < minBid;
  const isBidInvalid =
    isBidEmpty || Number.isNaN(parsedBidAmount) || isBidBelowMinimum;
  const premium = Number(bidAmount || 0) * Number(auction.buyerPremiumRate);
  const showLoserState = isEnded && !socket.isWinner && socket.auctionEnded;
  const showResultButton = isEnded && !socket.auctionEnded;
  const hasActiveHoldForAuction = walletHolds.some((hold) => hold.auctionId === id);

  const productImageUri = getProductImageUri(
    product,
    auction.productImage ||
      `https://placehold.co/900x720/F8F9FA/0097D8?text=${encodeURIComponent(
        t('auction.placeholderImage'),
      )}`,
  );

  const auctionTypeLabel = getAuctionTypeLabel(auction.auctionType, t);
  const conditionLabel = getAuctionConditionLabel(product?.condition, t);
  const statusLabel = getAuctionStatusLabel(isActive, isEnded, t);

  const handleBid = async () => {
    if (isBidEmpty) {
      showModal({
        title: t('common.error'),
        message: t('auction.emptyBidError'),
        type: 'error',
      });
      return;
    }

    const amount = parsedBidAmount;
    if (Number.isNaN(amount) || amount < minBid) {
      showModal({
        title: t('common.error'),
        message: t('auction.minBidError', {
          amount: minBid.toFixed(2),
        }),
        type: 'error',
      });
      return;
    }

    try {
      await placeBid.mutateAsync({ auctionId: id, amount });
      showModal({
        title: t('auction.bidAcceptedTitle'),
        message: t('auction.bidAcceptedMessage', {
          amount: formatAmount(amount),
        }),
        type: 'success',
      });
    } catch (error: unknown) {
      const message = resolveApiErrorMessage(
        error,
        t,
        'auction.bidErrorFallback',
      );
      showModal({
        title: t('common.error'),
        message,
        type: 'error',
      });
    }
  };

  const handleWithdrawBid = () => {
    showModal({
      title: t('auction.withdrawBidTitle'),
      message: t('auction.withdrawBidMessage'),
      type: 'info',
      confirmText: t('auction.withdrawBidConfirm'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        try {
          await withdrawBid.mutateAsync({ auctionId: id });
          showModal({
            title: t('auction.withdrawBidSuccessTitle'),
            message: t('auction.withdrawBidSuccessMessage'),
            type: 'success',
          });
        } catch (error: unknown) {
          showModal({
            title: t('common.error'),
            message: resolveApiErrorMessage(error, t, 'auction.withdrawBidErrorFallback'),
            type: 'error',
          });
        }
      },
    });
  };

  // Auction state remains the source of truth for pricing and timing,
  // while product detail enriches the premium presentation layer.
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AuctionHero
          imageUri={productImageUri}
          title={auction.productTitle || t('auction.placeholderImage')}
          lotNumber={auction.lotNumber}
          sellerName={auction.sellerName}
          categoryName={product?.categoryName}
          statusLabel={statusLabel}
          isActive={isActive}
          isEnded={isEnded}
          viewerCount={socket.viewerCount}
          isConnected={socket.isConnected}
          auctionType={auction.auctionType}
          auctionTypeLabel={auctionTypeLabel}
          onBack={() => router.back()}
          t={t}
        />

        <View style={styles.content}>
          <AuctionSummaryPanel
            currentPrice={currentPrice}
            startPrice={Number(auction.startPrice)}
            minBid={minBid}
            buyerPremiumRate={Number(auction.buyerPremiumRate)}
            bidCount={bidCount}
            walletAvailable={wallet?.available}
            endTime={endTime}
            serverTime={serverTime}
            isActive={isActive}
            isEnded={isEnded}
            isSeller={isSeller}
            isWinner={socket.isWinner}
            showLoserState={showLoserState}
            showResultButton={showResultButton}
            finalPrice={socket.finalPrice}
            lastBid={socket.lastBid}
            onViewResult={() => router.push(`/auction/${id}/result` as never)}
            t={t}
          />

          <AuctionRulesPanel
            sellerName={auction.sellerName}
            categoryName={product?.categoryName}
            conditionLabel={conditionLabel}
            description={product?.description}
            auctionTypeLabel={auctionTypeLabel}
            minIncrement={Number(auction.minIncrement)}
            antiSnipingEnabled={auction.antiSnipingEnabled}
            extensionSeconds={auction.extensionSeconds}
            currentExtensions={auction.currentExtensions}
            maxExtensions={auction.maxExtensions}
            culturalAssetRestricted={auction.culturalAssetRestricted}
            t={t}
          />

          <AuctionBidHistory bids={bids ?? []} t={t} />
        </View>
      </ScrollView>

      {isActive && !isSeller ? (
        <View style={styles.stickyComposer}>
          <AuctionBidComposer
            bidAmount={bidAmount}
            onChangeText={setBidAmount}
            placeholder={minBid.toString()}
            minBidText={t('auction.minBid', {
              amount: formatAmount(minBid),
            })}
            premiumTotalText={t('auction.premiumTotal', {
              amount: formatAmount((Number.isNaN(parsedBidAmount) ? 0 : parsedBidAmount) + premium),
            })}
            disabled={placeBid.isPending || isBidInvalid}
            isPending={placeBid.isPending}
            onSubmit={handleBid}
            t={t}
          />
          {hasActiveHoldForAuction ? (
            <TouchableOpacity
              style={styles.withdrawButton}
              onPress={handleWithdrawBid}
              activeOpacity={0.85}
              disabled={withdrawBid.isPending}
            >
              <Text style={styles.withdrawButtonText}>
                {withdrawBid.isPending
                  ? t('common.loading')
                  : t('auction.withdrawBidCta')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
