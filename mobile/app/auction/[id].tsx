import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuctionStatus } from '@endemigo/shared';
import { Ionicons } from '@expo/vector-icons';
import ENV from '../../lib/config';

import {
  useAuction,
  useAuctionBids,
  usePlaceBid,
  useWithdrawBid,
  useAuctionResult,
  useCompleteAuctionPayment,
  useAuctionRegistrationStatus,
  useRegisterToAuction,
  useSavedCards,
  usePayDeposit,
} from '../../hooks/useAuctions';
import { CardVerificationModal } from '../../components/auction/CardVerificationModal';
import { AuthRegisterWizardModal } from '../../components/auth/AuthRegisterWizardModal';
import { BiddingLimitModal } from '../../components/auction/BiddingLimitModal';
import { useAuctionSocket } from '../../hooks/useAuctionSocket';
import { useWalletBalance, useWalletHolds } from '../../hooks/useWallet';
import { useAuthStore } from '../../store/authStore';
import { useModalStore } from '../../store/modalStore';
import { updateClockOffset, getSynchronizedTime } from '../../utils/clockSync';
import { resolveApiErrorMessage } from '../../utils/apiError';
import { formatAmount, formatCurrency } from '../../utils/transactionFormatters';
import { calculateAuctionBidEstimate } from '../../utils/auctionBidConsole';
import { Colors, Spacing } from '../../constants/theme';
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
  const { showModal, hideModal } = useModalStore();
  const { data: auction, isLoading, refetch } = useAuction(id);
  const { data: bids, refetch: refetchBids } = useAuctionBids(id);
  const { data: wallet } = useWalletBalance();
  const { data: walletHolds = [] } = useWalletHolds();
  const placeBid = usePlaceBid();
  const withdrawBid = useWithdrawBid();
  const { data: registrationData, refetch: refetchRegistrationStatus } = useAuctionRegistrationStatus(id, !!user);
  const registerMutation = useRegisterToAuction();
  const { data: cardsData } = useSavedCards(!!user);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showAuthWizardModal, setShowAuthWizardModal] = useState(false);
  const payDepositMutation = usePayDeposit();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalData, setLimitModalData] = useState<{
    currentLimit: number;
    requiredLimit: number;
    requiredDeposit: number;
  } | null>(null);
  const socket = useAuctionSocket(id);
  const { data: product } = useProduct(auction?.productId ?? '');
  const insets = useSafeAreaInsets();
  const [bidAmount, setBidAmount] = useState('');
  const [maxBidAmount, setMaxBidAmount] = useState('');
  const [activeProxyAmount, setActiveProxyAmount] = useState<number | null>(null);
  const [bidState, setBidState] = useState<'leading' | 'outbid' | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  const apiCurrentPrice = Number(auction?.currentPrice || 0);
  const socketCurrentPrice = Number(socket.currentPrice || 0);
  const currentPrice = Math.max(apiCurrentPrice, socketCurrentPrice);
  const bidCount = Math.max(auction?.bidCount || 0, socket.bidCount || 0);
  const endTime = socket.endTime || auction?.endTime || '';
  const serverTime = socket.serverTime || auction?.serverTime || '';

  // Synchronize clock offset with server time
  useEffect(() => {
    updateClockOffset(serverTime);
  }, [serverTime]);

  const endMs = endTime ? new Date(endTime).getTime() : 0;
  // eslint-disable-next-line react-hooks/purity
  const isTimeEnded = endMs > 0 && endMs <= getSynchronizedTime();
  const isEnded =
    auction?.status === AuctionStatus.ENDED ||
    auction?.status === AuctionStatus.COMPLETED ||
    socket.auctionEnded ||
    isTimeEnded;

  const completeAuctionPayment = useCompleteAuctionPayment();
  const { data: result } = useAuctionResult(isEnded ? id : '');

  // Resync REST state after a socket (re)connect: events missed while the
  // socket was down are not replayed, so price/bids could otherwise stay stale.
  const wasConnectedRef = useRef(false);
  useEffect(() => {
    if (socket.isConnected) {
      if (!wasConnectedRef.current) {
        refetch();
        refetchBids();
      }
      wasConnectedRef.current = true;
    } else {
      wasConnectedRef.current = false;
    }
  }, [socket.isConnected, refetch, refetchBids]);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBidState('outbid');
      setActiveProxyAmount(null);
    }
  }, [socket.wasOutbid]);

  useEffect(() => {
    if (auction?.minIncrement) {
      const nextBidAmount = currentPrice + Number(auction.minIncrement);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBidAmount((prev) => {
        const parsedPrev = parseFloat(prev);
        if (!prev || isNaN(parsedPrev) || parsedPrev < nextBidAmount) {
          return nextBidAmount.toString();
        }
        return prev;
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMaxBidAmount((prev) => {
        const parsedPrev = parseFloat(prev);
        if (prev && !isNaN(parsedPrev) && parsedPrev < nextBidAmount) {
          return '';
        }
        return prev;
      });
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

  const isActive = auction.status === AuctionStatus.ACTIVE && !isEnded;
  const isUpcoming =
    (auction.status === AuctionStatus.PUBLISHED ||
      auction.status === AuctionStatus.DRAFT) &&
    !isActive &&
    !isEnded;
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
  const minIncrement = Number(auction.minIncrement);
  const isBidNotIncrementMultiple =
    !isBidEmpty &&
    !Number.isNaN(parsedBidAmount) &&
    (Math.round((parsedBidAmount - currentPrice) * 100) % Math.round(minIncrement * 100) !== 0);

  const isPreBid = isUpcoming;

  const isBidInvalid = isPreBid
    ? isMaxBidEmpty || Number.isNaN(parsedMaxBidAmount) || parsedMaxBidAmount < minBid
    : (isBidEmpty
       || Number.isNaN(parsedBidAmount)
       || isBidBelowMinimum
       || isMaxBidBelowBid
       || isBidNotIncrementMultiple);

  const validationError = (() => {
    if (isBidEmpty || Number.isNaN(parsedBidAmount)) return null;
    if (isBidBelowMinimum) {
      return t('auction.bidBelowMinimumError', {
        amount: formatAmount(minBid),
      });
    }
    if (isBidNotIncrementMultiple) {
      return t('auction.bidIncrementMultipleError', {
        minIncrement: formatAmount(minIncrement),
        val1: formatAmount(minBid),
        val2: formatAmount(minBid + minIncrement),
        val3: formatAmount(minBid + 2 * minIncrement),
      });
    }
    return null;
  })();
  const premiumBaseAmount = !isMaxBidEmpty && !Number.isNaN(parsedMaxBidAmount)
    ? parsedMaxBidAmount
    : Number.isNaN(parsedBidAmount)
      ? 0
      : parsedBidAmount;
  const resolvedIsWinner = socket.isWinner || (isEnded && auction.winnerId === user?.id);
  const userFullName = user ? `${user.firstName} ${user.lastName}`.trim().toLowerCase() : '';
  const hasUserBid = bids?.some((bid) => bid.bidderName.toLowerCase() === userFullName) ?? false;
  const showLoserState = isEnded && !resolvedIsWinner && socket.auctionEnded && hasUserBid;
  const showResultButton = isEnded;

  const maskWinnerName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return 'Anonim';
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0];
    const firstName = parts.slice(0, -1).join(' ');
    const lastName = parts[parts.length - 1];
    const lastInitial = lastName ? lastName.charAt(0) + '.' : '';
    return `${firstName} ${lastInitial}`.trim();
  };

  const winnerName = result?.winner
    ? (result.winner.id === user?.id
      ? t('auction.you', { defaultValue: 'Siz' })
      : maskWinnerName(result.winner.name))
    : result === undefined
      ? undefined
      : null;

  const showPaymentButton = isEnded && resolvedIsWinner && result?.paymentStatus === 'PENDING';
  const showOrderButton = isEnded && resolvedIsWinner && result?.paymentStatus === 'PAID' && !!result.orderId;
  const showCalendarButton = isUpcoming;

  const handleAddToCalendar = () => {
    const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    const start = formatDate(auction.startTime);
    const end = formatDate(auction.endTime);
    const rawTitle = auction.productTitle || t('auction.placeholderImage');
    const rawDetails = `Endemigo Müzayede İlanı: ${product?.description || ''}\nLink: https://endemigo.com/auctions/${id}`;

    if (Platform.OS === 'ios') {
      const url = `${ENV.API_URL}/auctions/${id}/ics`;
      Linking.openURL(url).catch(() => {
        // Fallback to web link if data URI fails on iOS
        const fallbackUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(rawTitle)}&dates=${start}/${end}&details=${encodeURIComponent(rawDetails)}`;
        Linking.openURL(fallbackUrl);
      });
    } else {
      const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(rawTitle)}&dates=${start}/${end}&details=${encodeURIComponent(rawDetails)}`;
      Linking.openURL(url).catch(() => {
        showModal({
          title: t('common.error'),
          message: t('common.genericError'),
          type: 'error',
        });
      });
    }
  };

  const handleCompletePayment = async () => {
    try {
      await completeAuctionPayment.mutateAsync({ auctionId: id });
      showModal({
        title: t('auction.paymentSuccessTitle', { defaultValue: 'Ödeme Başarılı!' }),
        message: t('auction.paymentSuccessMessage', { defaultValue: 'Ödemeniz başarıyla alındı.' }),
        type: 'success',
        confirmText: t('common.ok'),
        onConfirm: () => {
          hideModal();
          refetch();
        },
      });
    } catch (error: unknown) {
      showModal({
        title: t('common.error'),
        message: resolveApiErrorMessage(error, t, 'common.genericError'),
        type: 'error',
      });
    }
  };
  const activeHoldForAuction = walletHolds.find(
    (hold) => hold.auctionId === id && !hold.releasedAt && !hold.capturedAt,
  );
  const hasActiveHoldForAuction = Boolean(activeHoldForAuction);
  const walletAvailableForBid =
    typeof wallet?.available === 'number'
      ? wallet.available + (activeHoldForAuction?.amount ?? 0)
      : undefined;
  const bidEstimate = calculateAuctionBidEstimate({
    bidAmount: premiumBaseAmount,
    buyerPremiumRate: 0,
    walletAvailable: walletAvailableForBid,
  });
  const isWalletGateClosed = !bidEstimate.isWalletSufficient;
  const feeEstimateRows = [
    {
      key: 'total',
      label: t('auction.estimatedTotalLabel'),
      value: formatCurrency(bidEstimate.estimatedTotal),
      tone: isWalletGateClosed ? 'error' as const : 'accent' as const,
    },
  ];
  const walletGateMessage = isWalletGateClosed
    ? t('auction.walletGateMessage', {
        shortfall: formatAmount(bidEstimate.walletShortfall),
      })
    : null;
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
    : null;
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
    if (!user) {
      setShowComposer(false);
      showModal({
        title: t('auth.loginRequired', { defaultValue: 'Giriş Gerekli' }),
        message: t('auth.loginRequiredMessage', { defaultValue: 'Teklif vermek için lütfen önce giriş yapın.' }),
        type: 'info',
        confirmText: t('auth.login', { defaultValue: 'Giriş Yap' }),
        cancelText: t('common.cancel', { defaultValue: 'İptal' }),
        onConfirm: () => {
          hideModal();
          router.push('/(auth)/login');
        },
      });
      return;
    }

    if (isBidEmpty) {
      setShowComposer(false);
      showModal({
        title: t('common.error'),
        message: t('auction.emptyBidError'),
        type: 'error',
      });
      return;
    }

    const amount = parsedBidAmount;
    if (Number.isNaN(amount) || amount < minBid) {
      setShowComposer(false);
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
      setShowComposer(false);
      showModal({
        title: t('common.error'),
        message: t('auction.maxBidError'),
        type: 'error',
      });
      return;
    }

    if (isWalletGateClosed) {
      setShowComposer(false);
      showModal({
        title: t('auction.walletGateTitle'),
        message: t('auction.walletGateModalMessage', {
          total: formatAmount(bidEstimate.estimatedTotal),
          shortfall: formatAmount(bidEstimate.walletShortfall),
        }),
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
        setShowComposer(false);
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
      setShowComposer(false);
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
    } catch (error: any) {
      setShowComposer(false);
      const responseData = error.response?.data;
      const errorPayload =
        responseData?.error && typeof responseData.error === 'object'
          ? responseData.error
          : responseData || error;

      if (errorPayload?.code === 'BIDDING_LIMIT_EXCEEDED') {
        setLimitModalData({
          currentLimit: Number(errorPayload.currentLimit),
          requiredLimit: Number(errorPayload.requiredLimit),
          requiredDeposit: Number(errorPayload.requiredDeposit),
        });
        setShowLimitModal(true);
        return;
      }

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

  const handleOpenComposerClick = async () => {
    // Pre-fill bid amount and reset max amount on open
    const lotCurrentPrice = Number(auction?.currentPrice || 0);
    const lotMinIncrement = Number(auction?.minIncrement || 1);
    const lotMinBid = lotCurrentPrice + lotMinIncrement;
    setBidAmount(lotMinBid.toString());
    setMaxBidAmount('');

    if (!user) {
      setShowAuthWizardModal(true);
      return;
    }

    const hasSavedCard = cardsData?.cards && cardsData.cards.length > 0;
    if (!hasSavedCard) {
      setShowCardModal(true);
      return;
    }

    const registration = registrationData?.registration;
    if (!registration) {
      try {
        showModal({
          title: t('common.loading', { defaultValue: 'Yükleniyor...' }),
          message: t('auction.registeringWithSavedCard', { defaultValue: 'Kayıtlı kartınızla müzayede kaydı oluşturuluyor...' }),
          type: 'info',
        });
        await registerMutation.mutateAsync({ auctionId: id });
        await refetchRegistrationStatus();
        hideModal();
        setShowComposer(true);
      } catch (err) {
        showModal({
          title: t('common.error'),
          message: resolveApiErrorMessage(err, t, 'common.genericError'),
          type: 'error',
        });
      }
      return;
    }

    if (registration.status === 'PENDING') {
      showModal({
        title: t('auction.registrationPending'),
        message: t('auction.registrationPendingMessage'),
        type: 'info',
        confirmText: t('common.ok'),
        onConfirm: () => hideModal(),
      });
      return;
    }

    if (registration.status === 'REJECTED') {
      showModal({
        title: t('common.error'),
        message: t('auction.registrationRejectedMessage'),
        type: 'error',
        confirmText: t('common.ok'),
        onConfirm: () => hideModal(),
      });
      return;
    }

    setShowComposer(true);
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
            bidCount={bidCount}
            viewerCount={socket.viewerCount}
            walletAvailable={wallet?.available}
            endTime={endTime}
            startTime={auction.startTime}
            serverTime={serverTime}
            isActive={isActive}
            isUpcoming={isUpcoming}
            isEnded={isEnded}
            isSeller={isSeller}
            isWinner={resolvedIsWinner}
            showLoserState={showLoserState}
            showResultButton={showResultButton}
            finalPrice={socket.finalPrice}
            lastBid={socket.lastBid}
            activityFeed={socket.activityFeed}
            winnerName={winnerName}
            onTimeExpired={refetch}
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
        <View style={[styles.stickyComposer, { paddingBottom: Math.max(Spacing.base, insets.bottom) }]}>
          <TouchableOpacity
            style={styles.openComposerButton}
            onPress={handleOpenComposerClick}
            activeOpacity={0.85}
          >
            <Text style={styles.openComposerButtonText}>{t('auction.placeBid')}</Text>
          </TouchableOpacity>
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
      ) : showPaymentButton ? (
        <View style={[styles.stickyComposer, { paddingBottom: Math.max(Spacing.base, insets.bottom) }]}>
          <TouchableOpacity
            style={styles.openComposerButton}
            onPress={handleCompletePayment}
            activeOpacity={0.85}
            disabled={completeAuctionPayment.isPending}
          >
            {completeAuctionPayment.isPending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="card" size={18} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.openComposerButtonText}>
                  {t('auction.completePayment')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : showOrderButton ? (
        <View style={[styles.stickyComposer, { paddingBottom: Math.max(Spacing.base, insets.bottom) }]}>
          <TouchableOpacity
            style={[styles.openComposerButton, { backgroundColor: Colors.secondary }]}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/orders/[orderId]',
                params: { orderId: result?.orderId ?? '' },
              } as never)
            }
            activeOpacity={0.85}
          >
            <Text style={styles.openComposerButtonText}>
              {t('auction.viewOrder')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : showCalendarButton ? (
        isSeller ? (
          <View style={[styles.stickyComposer, { paddingBottom: Math.max(Spacing.base, insets.bottom) }]}>
            <TouchableOpacity
              style={styles.upcomingCalendarButton}
              onPress={handleAddToCalendar}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={18} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.openComposerButtonText}>
                {t('auction.addToCalendar', { defaultValue: 'Takvime Ekle (Hatırlatıcı)' })}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.upcomingComposerRow, { paddingBottom: Math.max(Spacing.base, insets.bottom) }]}>
            <TouchableOpacity
              style={styles.upcomingCalendarButton}
              onPress={handleAddToCalendar}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={18} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.openComposerButtonText}>
                {t('auction.addToCalendarShort', { defaultValue: 'Takvim' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.upcomingPreBidButton}
              onPress={handleOpenComposerClick}
              activeOpacity={0.85}
            >
              <Text style={styles.openComposerButtonText}>
                {t('auction.placePreBid', { defaultValue: 'Ön Teklif Ver' })}
              </Text>
            </TouchableOpacity>
          </View>
        )
      ) : null}

      <Modal
        visible={showComposer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowComposer(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackgroundClose}
            activeOpacity={1}
            onPress={() => setShowComposer(false)}
          />
          <View style={styles.modalContent}>
            <AuctionBidComposer
              bidAmount={bidAmount}
              maxBidAmount={maxBidAmount}
              quickBidOptions={quickBidOptions}
              feeEstimateRows={feeEstimateRows}
              statusMessage={bidStatusMessage}
              proxyMessage={proxyMessage}
              walletGateMessage={walletGateMessage}
              validationError={validationError}
              onChangeText={setBidAmount}
              onChangeMaxBidText={setMaxBidAmount}
              onSelectQuickBid={setBidAmount}
              placeholder={minBid.toString()}
              maxPlaceholder={t('auction.maxBidPlaceholder')}
              minBidText={t('auction.minBid', {
                amount: formatAmount(minBid),
              })}
              disabled={placeBid.isPending || isBidInvalid || isWalletGateClosed}
              isPending={placeBid.isPending}
              onSubmit={handleBid}
              onClose={() => setShowComposer(false)}
              t={t}
              lotTitle={product?.title}
              lotNumber={auction.lotNumber}
              isPreBid={isPreBid}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showCardModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCardModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackgroundClose}
            activeOpacity={1}
            onPress={() => setShowCardModal(false)}
          />
          <View style={styles.modalContent}>
            <CardVerificationModal
              onClose={() => setShowCardModal(false)}
              onVerify={async (cardDetails) => {
                try {
                  await registerMutation.mutateAsync({
                    auctionId: id,
                    cardDetails,
                  });
                  await refetchRegistrationStatus();
                  setShowCardModal(false);
                  setShowComposer(true);
                } catch (error) {
                  showModal({
                    title: t('common.error'),
                    message: resolveApiErrorMessage(error, t, 'common.genericError'),
                    type: 'error',
                  });
                }
              }}
              isPending={registerMutation.isPending}
              requiredDeposit={Number(auction?.requiredDeposit ?? 0)}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showAuthWizardModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAuthWizardModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackgroundClose}
            activeOpacity={1}
            onPress={() => setShowAuthWizardModal(false)}
          />
          <View style={styles.modalContent}>
            <AuthRegisterWizardModal
              onClose={() => setShowAuthWizardModal(false)}
              onVerifyAndRegister={async (cardDetails) => {
                try {
                  await registerMutation.mutateAsync({
                    auctionId: id,
                    cardDetails,
                  });
                  await refetchRegistrationStatus();
                  setShowAuthWizardModal(false);
                  setShowComposer(true);
                } catch (error) {
                  showModal({
                    title: t('common.error'),
                    message: resolveApiErrorMessage(error, t, 'common.genericError'),
                    type: 'error',
                  });
                }
              }}
              onLoginComplete={async () => {
                await refetchRegistrationStatus();
                setShowAuthWizardModal(false);
              }}
              isPending={registerMutation.isPending}
              requiredDeposit={Number(auction?.requiredDeposit ?? 0)}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showLimitModal && !!limitModalData}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLimitModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackgroundClose}
            activeOpacity={1}
            onPress={() => setShowLimitModal(false)}
          />
          <View style={styles.modalContent}>
            {limitModalData && (
              <BiddingLimitModal
                onClose={() => setShowLimitModal(false)}
                onPayDeposit={async (amount, cardDetails) => {
                  try {
                    await payDepositMutation.mutateAsync({
                      amount,
                      cardDetails,
                    });
                    setShowLimitModal(false);
                    showModal({
                      title: t('auction.depositSuccessTitle'),
                      message: t('auction.depositSuccessMessage', {
                        limit: (limitModalData.currentLimit + amount * 5).toLocaleString('tr-TR'),
                      }),
                      type: 'success',
                      confirmText: t('common.ok'),
                      onConfirm: () => {
                        hideModal();
                        setShowComposer(true);
                      },
                    });
                  } catch (error) {
                    showModal({
                      title: t('common.error'),
                      message: resolveApiErrorMessage(error, t, 'common.genericError'),
                      type: 'error',
                    });
                  }
                }}
                currentLimit={limitModalData.currentLimit}
                requiredLimit={limitModalData.requiredLimit}
                requiredDeposit={limitModalData.requiredDeposit}
                isPending={payDepositMutation.isPending}
                hasSavedCard={!!(cardsData?.cards && cardsData.cards.length > 0)}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
