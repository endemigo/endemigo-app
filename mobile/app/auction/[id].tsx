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
import { styles } from '../../styles/auction/_id.styles';
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
  const [maxBidAmount, setMaxBidAmount] = useState('');
  const [activeProxyAmount, setActiveProxyAmount] = useState<number | null>(null);
  const [bidState, setBidState] = useState<'leading' | 'outbid' | null>(null);

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
    if (socket.wasOutbid) {
      setBidState('outbid');
      setActiveProxyAmount(null);
    }
  }, [socket.wasOutbid]);

  useEffect(() => {
    if (auction?.minIncrement) {
      const nextBidAmount = currentPrice + Number(auction.minIncrement);
      setBidAmount(nextBidAmount.toString());
      setMaxBidAmount('');
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
  const parsedMaxBidAmount = parseFloat(maxBidAmount);
  const isBidEmpty = bidAmount.trim().length === 0;
  const isMaxBidEmpty = maxBidAmount.trim().length === 0;
  const isBidBelowMinimum =
    !isBidEmpty && !Number.isNaN(parsedBidAmount) && parsedBidAmount < minBid;
  const isMaxBidBelowBid =
    !isMaxBidEmpty
    && !Number.isNaN(parsedMaxBidAmount)
    && parsedMaxBidAmount < parsedBidAmount;
  const isBidInvalid =
    isBidEmpty
    || Number.isNaN(parsedBidAmount)
    || isBidBelowMinimum
    || isMaxBidBelowBid;
  const premiumBaseAmount = !isMaxBidEmpty && !Number.isNaN(parsedMaxBidAmount)
    ? parsedMaxBidAmount
    : Number.isNaN(parsedBidAmount)
      ? 0
      : parsedBidAmount;
  const premium = premiumBaseAmount * Number(auction.buyerPremiumRate);
  const showLoserState = isEnded && !socket.isWinner && socket.auctionEnded;
  const showResultButton = isEnded && !socket.auctionEnded;
  const hasActiveHoldForAuction = walletHolds.some((hold) => hold.auctionId === id);
  const quickBidOptions = [
    {
      key: 'min',
      label: t('auction.quickBidMin', { amount: formatAmount(minBid) }),
      amount: String(minBid),
    },
    {
      key: 'plusOne',
      label: t('auction.quickBidPlusOne', {
        amount: formatAmount(minBid + Number(auction.minIncrement)),
      }),
      amount: String(minBid + Number(auction.minIncrement)),
    },
    {
      key: 'plusThree',
      label: t('auction.quickBidPlusThree', {
        amount: formatAmount(minBid + Number(auction.minIncrement) * 3),
      }),
      amount: String(minBid + Number(auction.minIncrement) * 3),
    },
  ];
  const bidStatusMessage = bidState
    ? t(
        bidState === 'leading'
          ? 'auction.leaderStateLeading'
          : 'auction.leaderStateOutbid',
      )
    : t('auction.leaderStateWatching');
  const proxyMessage = activeProxyAmount
    ? t('auction.proxyActiveMessage', {
        amount: formatAmount(activeProxyAmount),
      })
    : null;

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

    if (isMaxBidBelowBid) {
      showModal({
        title: t('common.error'),
        message: t('auction.maxBidError'),
        type: 'error',
      });
      return;
    }

    try {
      const result = await placeBid.mutateAsync({
        auctionId: id,
        amount,
        maxAmount:
          !isMaxBidEmpty && !Number.isNaN(parsedMaxBidAmount)
            ? parsedMaxBidAmount
            : undefined,
      });
      if (result?.bid?.isLeadingBid === false) {
        setBidState('outbid');
        setActiveProxyAmount(null);
        showModal({
          title: t('auction.proxyOutbidTitle'),
          message: t('auction.proxyOutbidMessage', {
            amount: formatAmount(result.auction?.currentPrice ?? amount),
          }),
          type: 'info',
        });
        return;
      }
      setBidState('leading');
      setActiveProxyAmount(
        !isMaxBidEmpty && !Number.isNaN(parsedMaxBidAmount) && parsedMaxBidAmount > amount
          ? parsedMaxBidAmount
          : null,
      );
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
          setBidState(null);
          setActiveProxyAmount(null);
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
            activityFeed={socket.activityFeed}
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
            reservePrice={auction.reservePrice}
            reserveMet={auction.reserveMet}
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
            maxBidAmount={maxBidAmount}
            quickBidOptions={quickBidOptions}
            statusMessage={bidStatusMessage}
            proxyMessage={proxyMessage}
            onChangeText={setBidAmount}
            onChangeMaxBidText={setMaxBidAmount}
            onSelectQuickBid={setBidAmount}
            placeholder={minBid.toString()}
            maxPlaceholder={t('auction.maxBidPlaceholder')}
            minBidText={t('auction.minBid', {
              amount: formatAmount(minBid),
            })}
            premiumTotalText={t('auction.premiumTotal', {
              amount: formatAmount(premiumBaseAmount + premium),
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
