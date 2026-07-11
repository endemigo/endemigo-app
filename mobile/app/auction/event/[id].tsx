import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuctionStatus, AuctionPaymentStatus } from '@endemigo/shared';
import * as SecureStore from 'expo-secure-store';

import {
  useAuctionEventDetails,
  usePlaceBid,
  useWithdrawBid,
  useAuctionBids,
  useAuctionResult,
  useAuctionRegistrationStatus,
  useRegisterToAuction,
  useSavedCards,
  usePayDeposit,
  useMyInvitations,
  useRespondInvitation,
} from '../../../hooks/useAuctions';
import { useAuctionEventSocket } from '../../../hooks/useAuctionEventSocket';
import { useWalletBalance, useWalletHolds } from '../../../hooks/useWallet';
import { useAuthStore } from '../../../store/authStore';
import { useModalStore } from '../../../store/modalStore';
import { resolveApiErrorMessage } from '../../../utils/apiError';
import { formatAmount, formatCurrency } from '../../../utils/transactionFormatters';
import { calculateAuctionBidEstimate } from '../../../utils/auctionBidConsole';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius } from '../../../constants/theme';
import { styles } from './event.styles';
import { useProduct } from '../../../hooks/useProducts';
import { getProductImageUri } from '../../../utils/productImages';
import { getAuctionConditionLabel } from '../../../utils/auctionPresentation';
import { SUPPORT_PHONE_URL } from '../../../constants/support';
import { AuctionBidComposer } from '../../../components/auction/AuctionBidComposer';
import { CardVerificationModal } from '../../../components/auction/CardVerificationModal';
import { AuthRegisterWizardModal } from '../../../components/auth/AuthRegisterWizardModal';
import { updateClockOffset, getSynchronizedTime } from '../../../utils/clockSync';
import { BiddingLimitModal } from '../../../components/auction/BiddingLimitModal';
import { LiveFeedOverlay } from '../../../components/auction/LiveFeedOverlay';
import { ProductImageCarousel } from '../../../components/ui';

export default function LiveEventRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('en') ? 'en' : 'tr';
  const { user } = useAuthStore();
  const { showModal, hideModal } = useModalStore();
  const insets = useSafeAreaInsets();

  const { data: eventDetails, isLoading: isDetailsLoading, refetch: refetchDetails } = useAuctionEventDetails(id);
  const eventCurrency = eventDetails?.event?.currency || 'TRY';
  const socket = useAuctionEventSocket(id, eventDetails?.event.activeLotId, eventCurrency);

  const { data: wallet } = useWalletBalance();
  const { data: walletHolds = [] } = useWalletHolds();
  const placeBid = usePlaceBid();
  const withdrawBid = useWithdrawBid();

  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'feed' | 'rules'>('catalog');
  const [bidAmount, setBidAmount] = useState('');
  const [maxBidAmount, setMaxBidAmount] = useState('');
  const [activeProxyAmount, setActiveProxyAmount] = useState<number | null>(null);
  const [bidState, setBidState] = useState<'leading' | 'outbid' | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [isBidLocked, setIsBidLocked] = useState(true);

  useEffect(() => {
    const checkLockStatus = async () => {
      try {
        const val = await SecureStore.getItemAsync('endemigo_bid_lock_disabled');
        if (val === 'true') {
          setIsBidLocked(false);
        }
      } catch (err) {
        console.error('Failed to read lock status from SecureStore:', err);
      }
    };
    checkLockStatus();
  }, []);

  // Selected upcoming lot to view in preview modal
  const [selectedLotForPreview, setSelectedLotForPreview] = useState<string | null>(null);
  const [biddingLotId, setBiddingLotId] = useState<string | null>(null);
  const [catalogSort, setCatalogSort] = useState<'lot' | 'priceAsc' | 'priceDesc'>('lot');

  // Local state for ticking countdown timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [transitionLeftSeconds, setTransitionLeftSeconds] = useState<number>(0);

  // Find active lot details from pre-fetched lots list or state
  const activeLotId = socket.activeLotId || eventDetails?.event.activeLotId;
  const activeLotDetails = eventDetails?.lots.find((lot) => lot.id === activeLotId);
  const biddingLotDetails = eventDetails?.lots.find((lot) => lot.id === biddingLotId) || activeLotDetails;

  // Fetch bids for the active lot to synchronize initial bidder state on load
  const { data: activeLotBids, refetch: refetchBids } = useAuctionBids(activeLotId ?? '');

  // Ortak müzayede daveti (davetli tarafı): bu event için bekleyen davet.
  const { data: myInvitations } = useMyInvitations(Boolean(user?.isSeller));
  const respondInvitation = useRespondInvitation();
  const pendingInvitation = myInvitations?.find(
    (inv) => inv.eventId === id && inv.status === 'PENDING',
  );

  const handleInvitationResponse = async (action: 'accept' | 'reject') => {
    if (!pendingInvitation) return;
    try {
      await respondInvitation.mutateAsync({ invitationId: pendingInvitation.id, action });
      showModal({
        title:
          action === 'accept'
            ? t('auction.invitationAcceptedTitle', { defaultValue: 'Davet Kabul Edildi' })
            : t('auction.invitationRejectedTitle', { defaultValue: 'Davet Reddedildi' }),
        message:
          action === 'accept'
            ? t('auction.invitationAcceptedMessage', {
                defaultValue: 'Artık bu müzayedeye lot ekleyebilirsiniz.',
              })
            : t('auction.invitationRejectedMessage', {
                defaultValue: 'Davet reddedildi.',
              }),
        type: action === 'accept' ? 'success' : 'info',
      });
    } catch (err) {
      showModal({
        title: t('common.error'),
        message: resolveApiErrorMessage(err, t, 'common.genericError'),
        type: 'error',
      });
    }
  };

  const registrationLotId = activeLotId || eventDetails?.lots[0]?.id || '';
  const { data: registrationData, refetch: refetchRegistrationStatus } = useAuctionRegistrationStatus(registrationLotId, !!user);
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

  // Resolve current price from both static details and socket updates
  const isBiddingActiveLot = !biddingLotId || biddingLotId === activeLotId;
  const apiCurrentPrice = Number(activeLotDetails?.currentPrice || 0);
  const socketCurrentPrice = Number(socket.currentPrice || 0);
  const currentLotPrice = isBiddingActiveLot
    ? Math.max(apiCurrentPrice, socketCurrentPrice)
    : Number(biddingLotDetails?.currentPrice || 0);
  const bidCount = isBiddingActiveLot
    ? Math.max(activeLotDetails?.bidCount || 0, socket.bidCount || 0)
    : Number(biddingLotDetails?.bidCount || 0);
  const endTime = socket.endTime || activeLotDetails?.endTime || '';
  const serverTime = socket.serverTime || activeLotDetails?.serverTime || '';

  // Hook product details for active lot
  const { data: activeProduct } = useProduct(activeLotDetails?.productId ?? '');

  // Resolve the current leading bidder's name from socket or initial bids list
  const leadingBidderName = socket.lastBid?.bidderName 
    || (activeLotBids && activeLotBids[0]?.bidderName) 
    || null;

  const maskBidderName = (name: string | null | undefined) => {
    if (!name) return null;
    const trimmed = name.trim();
    if (!trimmed) return 'Anonim';
    if (trimmed.endsWith('.')) return trimmed;
    
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0];
    const firstName = parts.slice(0, -1).join(' ');
    const lastName = parts[parts.length - 1];
    const lastInitial = lastName ? lastName.charAt(0) + '.' : '';
    return `${firstName} ${lastInitial}`.trim();
  };

  const previewedLot = eventDetails?.lots.find((lot) => lot.id === selectedLotForPreview);
  const isPreviewedLotEnded = previewedLot
    ? previewedLot.status === AuctionStatus.ENDED ||
      previewedLot.status === AuctionStatus.COMPLETED ||
      (previewedLot.endTime ? new Date(previewedLot.endTime).getTime() <= getSynchronizedTime() : false)
    : false;
  const { data: previewedProduct } = useProduct(previewedLot?.productId ?? '');
  const { data: previewedResult } = useAuctionResult(
    selectedLotForPreview && isPreviewedLotEnded ? selectedLotForPreview : ''
  );

  useEffect(() => {
    if (socket.lastBid) {
      refetchDetails();
      refetchBids();
    }
  }, [refetchDetails, refetchBids, socket.lastBid]);

  useEffect(() => {
    if (socket.lotEnded) {
      refetchDetails();
      refetchBids();
    }
  }, [refetchDetails, refetchBids, socket.lotEnded]);

  useEffect(() => {
    if (socket.wasOutbid) {
      setBidState('outbid');
      setActiveProxyAmount(null);
    }
  }, [socket.wasOutbid]);

  useEffect(() => {
    if (socket.eventStatus) {
      refetchDetails();
    }
  }, [refetchDetails, socket.eventStatus]);

  // Synchronize clock offset with server time
  useEffect(() => {
    updateClockOffset(serverTime);
  }, [serverTime]);

  // Handle active lot changes - reset bid compose form values
  useEffect(() => {
    if (activeLotId) {
      setBidState(null);
      setActiveProxyAmount(null);
      setBidAmount('');
      setMaxBidAmount('');
      if (user) {
        refetchRegistrationStatus();
      }
    }
  }, [activeLotId, user, refetchRegistrationStatus]);

  // Synchronize bidState with initial fetch and socket updates
  useEffect(() => {
    if (!user) {
      setBidState(null);
      return;
    }

    const loggedInFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const loggedInMaskedName = `${user.firstName || ''} ${user.lastName ? user.lastName.charAt(0) + '.' : ''}`.trim();

    const isUserBidder = (name: string) => {
      const cleanName = (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const cleanFullName = loggedInFullName.replace(/\s+/g, ' ').toLowerCase();
      const cleanMaskedName = loggedInMaskedName.replace(/\s+/g, ' ').toLowerCase();
      return cleanName === cleanFullName || cleanName === cleanMaskedName;
    };

    // 1. If we have socket updates, prioritize them
    if (socket.lastBid) {
      if (isUserBidder(socket.lastBid.bidderName)) {
        setBidState('leading');
      } else {
        setBidState('outbid');
      }
      return;
    }

    // 2. Otherwise, check the bids list from initial fetch
    if (activeLotBids && activeLotBids.length > 0) {
      // Bids are sorted DESC by amount, so index 0 is the leading bid
      const highestBid = activeLotBids[0];
      if (highestBid && isUserBidder(highestBid.bidderName)) {
        setBidState('leading');
      } else {
        // If the user has placed any bid but is not leading, they are outbid
        const hasUserBid = activeLotBids.some((bid) => isUserBidder(bid.bidderName));
        if (hasUserBid) {
          setBidState('outbid');
        } else {
          setBidState(null);
        }
      }
    } else {
      setBidState(null);
    }
  }, [activeLotBids, socket.lastBid, user]);

  // Run countdown timer locally
  useEffect(() => {
    // Süresiz etkinlikte geri sayım yok; lot ancak panelden kapanır.
    if (eventDetails?.event?.isUntimed) {
      setTimeLeftSeconds(0);
      return;
    }

    if (activeLotDetails?.status === 'PUBLISHED') {
      setTimeLeftSeconds(activeLotDetails.pausedRemainingSeconds || 0);
      return;
    }

    if (!endTime) {
      setTimeLeftSeconds(0);
      return;
    }

    const timer = setInterval(() => {
      const endMs = new Date(endTime).getTime();
      const nowMs = getSynchronizedTime();
      const diff = Math.max(0, Math.ceil((endMs - nowMs) / 1000));
      setTimeLeftSeconds(diff);
      if (diff <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    // Initial calculation
    const endMs = new Date(endTime).getTime();
    const nowMs = getSynchronizedTime();
    setTimeLeftSeconds(Math.max(0, Math.ceil((endMs - nowMs) / 1000)));

    return () => clearInterval(timer);
  }, [endTime, activeLotDetails?.status, activeLotDetails?.pausedRemainingSeconds, eventDetails?.event?.isUntimed]);

  useEffect(() => {
    if (!socket.isTransitioning || !socket.transitionEndTime) {
      setTransitionLeftSeconds(0);
      return;
    }

    const calculateTransitionLeft = () => {
      const end = new Date(socket.transitionEndTime!).getTime();
      const now = getSynchronizedTime();
      const diff = Math.max(0, Math.round((end - now) / 1000));
      return diff;
    };

    setTransitionLeftSeconds(calculateTransitionLeft());

    const interval = setInterval(() => {
      setTransitionLeftSeconds((prev) => {
        const next = calculateTransitionLeft();
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [socket.isTransitioning, socket.transitionEndTime]);

  useEffect(() => {
    if (activeLotDetails?.minIncrement) {
      const nextBidAmount = currentLotPrice + Number(activeLotDetails.minIncrement);
      setBidAmount((prev) => {
        const parsedPrev = parseFloat(prev);
        if (!prev || isNaN(parsedPrev) || parsedPrev < nextBidAmount) {
          return nextBidAmount.toString();
        }
        return prev;
      });
      setMaxBidAmount((prev) => {
        const parsedPrev = parseFloat(prev);
        if (prev && !isNaN(parsedPrev) && parsedPrev < nextBidAmount) {
          return '';
        }
        return prev;
      });
    }
  }, [activeLotDetails?.minIncrement, currentLotPrice]);

  if (isDetailsLoading || !eventDetails) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.auctionGreen} />
      </View>
    );
  }

  const { event, lots } = eventDetails;

  // Sort lots: active at the top, waiting in the middle, ended at the bottom
  const sortedLots = [...(lots || [])].sort((a, b) => {
    const getPriority = (lot: typeof a) => {
      const isActive = lot.id === activeLotId;
      const isEnded = lot.status === AuctionStatus.ENDED || lot.status === AuctionStatus.COMPLETED;
      if (isActive) return 0;
      if (!isEnded) return 1;
      return 2;
    };
    const priorityA = getPriority(a);
    const priorityB = getPriority(b);
    if (priorityA !== priorityB) return priorityA - priorityB;
    return (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0);
  });

  const isSeller = activeLotDetails ? user?.id === activeLotDetails.sellerId : false;
  const isLotEnded = activeLotDetails
    ? activeLotDetails.status === AuctionStatus.ENDED ||
      activeLotDetails.status === AuctionStatus.COMPLETED ||
      socket.lotEnded ||
      (endTime ? new Date(endTime).getTime() <= getSynchronizedTime() : false)
    : false;
  const minIncrement = biddingLotDetails ? Number(biddingLotDetails.minIncrement) : 1;
  const minBid = biddingLotDetails ? currentLotPrice + minIncrement : 0;
  const parsedBidAmount = parseFloat(bidAmount);
  const parsedMaxBidAmount = parseFloat(maxBidAmount);
  const isBidEmpty = bidAmount.trim().length === 0;
  const isMaxBidEmpty = maxBidAmount.trim().length === 0;
  const isBidBelowMinimum =
    !isBidEmpty && !Number.isNaN(parsedBidAmount) && parsedBidAmount < minBid;
  const isMaxBidBelowBid =
    !isMaxBidEmpty &&
    !Number.isNaN(parsedMaxBidAmount) &&
    parsedMaxBidAmount < parsedBidAmount;
  const isBidNotIncrementMultiple =
    !isBidEmpty &&
    !Number.isNaN(parsedBidAmount) &&
    (Math.round((parsedBidAmount - currentLotPrice) * 100) % Math.round(minIncrement * 100) !== 0);

  const isPreBid = biddingLotDetails
    ? biddingLotDetails.status !== AuctionStatus.ACTIVE &&
      biddingLotDetails.status !== AuctionStatus.ENDED &&
      biddingLotDetails.status !== AuctionStatus.COMPLETED
    : false;

  const isBidInvalid = isPreBid
    ? isMaxBidEmpty || Number.isNaN(parsedMaxBidAmount) || parsedMaxBidAmount < minBid
    : (isBidEmpty ||
       Number.isNaN(parsedBidAmount) ||
       isBidBelowMinimum ||
       isMaxBidBelowBid ||
       isBidNotIncrementMultiple);

  const validationError = (() => {
    if (isBidEmpty || Number.isNaN(parsedBidAmount)) return null;
    if (isBidBelowMinimum) {
      return t('auction.bidBelowMinimumError', {
        amount: formatCurrency(minBid, eventCurrency),
      });
    }
    if (isBidNotIncrementMultiple) {
      return t('auction.bidIncrementMultipleError', {
        minIncrement: formatCurrency(minIncrement, eventCurrency),
        val1: formatCurrency(minBid, eventCurrency),
        val2: formatCurrency(minBid + minIncrement, eventCurrency),
        val3: formatCurrency(minBid + 2 * minIncrement, eventCurrency),
      });
    }
    return null;
  })();

  const premiumBaseAmount =
    !isMaxBidEmpty && !Number.isNaN(parsedMaxBidAmount)
      ? parsedMaxBidAmount
      : Number.isNaN(parsedBidAmount)
      ? 0
      : parsedBidAmount;

  const activeHoldForAuction = walletHolds.find(
    (hold) => hold.auctionId === activeLotId && !hold.releasedAt && !hold.capturedAt,
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
  // Pey için cüzdan bakiyesi/bloke gerekmez — risk, backend'deki
  // müzayede limiti (depozit) kontrolüyle yönetilir.
  const isWalletGateClosed = false;

  const feeEstimateRows = [
    {
      key: 'total',
      label: t('auction.estimatedTotalLabel'),
      value: formatCurrency(bidEstimate.estimatedTotal, eventCurrency),
      tone: isWalletGateClosed ? ('error' as const) : ('accent' as const),
    },
  ];

  const walletGateMessage = isWalletGateClosed
    ? t('auction.walletGateMessage', {
        shortfall: formatAmount(bidEstimate.walletShortfall),
      })
    : null;

  const quickBidOptions = biddingLotDetails
    ? [
        {
          key: 'min',
          label: t('auction.quickBidMin', { amount: formatCurrency(minBid, eventCurrency) }),
          amount: String(minBid),
        },
        {
          key: 'plusOne',
          label: t('auction.quickBidPlusOne', {
            amount: formatCurrency(minBid + Number(biddingLotDetails.minIncrement), eventCurrency),
          }),
          amount: String(minBid + Number(biddingLotDetails.minIncrement)),
        },
        {
          key: 'plusThree',
          label: t('auction.quickBidPlusThree', {
            amount: formatCurrency(minBid + Number(biddingLotDetails.minIncrement) * 3, eventCurrency),
          }),
          amount: String(minBid + Number(biddingLotDetails.minIncrement) * 3),
        },
      ]
    : [];

  const bidStatusMessage = bidState
    ? t(
        bidState === 'leading'
          ? 'auction.leaderStateLeading'
          : 'auction.leaderStateOutbid',
      )
    : null;

  const proxyMessage = activeProxyAmount
    ? t('auction.proxyActiveMessage', {
        amount: formatCurrency(activeProxyAmount, eventCurrency),
      })
    : null;

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

    const targetLotId = biddingLotId || activeLotId;
    if (!targetLotId) return;

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
          amount: formatCurrency(minBid, eventCurrency),
        }),
        type: 'error',
      });
      return;
    }

    const diff = amount - currentLotPrice;
    const diffCents = Math.round(diff * 100);
    const incrementCents = Math.round(Number(biddingLotDetails?.minIncrement || 0) * 100);
    if (incrementCents > 0 && diffCents % incrementCents !== 0) {
      setShowComposer(false);
      showModal({
        title: t('common.error'),
        message: t('auction.bidIncrementError', {
          increment: formatCurrency(Number(biddingLotDetails?.minIncrement ?? 0), eventCurrency),
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

    try {
      const result = await placeBid.mutateAsync({
        auctionId: targetLotId,
        amount,
        maxAmount:
          !isMaxBidEmpty && !Number.isNaN(parsedMaxBidAmount)
            ? parsedMaxBidAmount
            : undefined,
      });
      if (result?.bid?.isLeadingBid === false) {
        setShowComposer(false);
        setBiddingLotId(null);
        setBidState('outbid');
        setActiveProxyAmount(null);
        showModal({
          title: t('auction.proxyOutbidTitle'),
          message: t('auction.proxyOutbidMessage', {
            amount: formatCurrency(result.auction?.currentPrice ?? amount, eventCurrency),
          }),
          type: 'info',
        });
        return;
      }
      setShowComposer(false);
      setBiddingLotId(null);
      setBidState('leading');
      setActiveProxyAmount(
        !isMaxBidEmpty && !Number.isNaN(parsedMaxBidAmount) && parsedMaxBidAmount > amount
          ? parsedMaxBidAmount
          : null,
      );
      showModal({
        title: t('auction.bidAcceptedTitle'),
        message: t('auction.bidAcceptedMessage', {
          amount: formatCurrency(amount, eventCurrency),
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

  const handleOpenComposerClick = async (targetLotId: string, checkLock = true) => {
    // Pre-fill bid amount and reset max amount on open based on the target lot
    const targetLot = eventDetails?.lots.find((lot) => lot.id === targetLotId);
    if (targetLot) {
      const lotCurrentPrice = Number(targetLot.currentPrice || 0);
      const lotMinIncrement = Number(targetLot.minIncrement || 1);
      const lotMinBid = lotCurrentPrice + lotMinIncrement;
      setBidAmount(lotMinBid.toString());
      setMaxBidAmount('');
    }

    if (checkLock && isBidLocked) {
      showModal({
        title: t('auction.bidLockedTitle', { defaultValue: 'Pey Kilidi Aktif' }),
        message: t('auction.bidLockedMessage', { defaultValue: 'Pey verebilmek için önce yanındaki kilit butonuna basarak kilidi açmalısınız.' }),
        type: 'info',
      });
      return;
    }

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
        const regRes = await registerMutation.mutateAsync({ auctionId: targetLotId });
        await refetchRegistrationStatus();
        hideModal();
        // Kayıt PENDING açılır; onay admin/sistemden düşer.
        if (regRes?.registration?.status === 'APPROVED') {
          setBiddingLotId(targetLotId);
          setShowComposer(true);
        } else {
          showModal({
            title: t('auction.registrationPending', { defaultValue: 'Katılım Onayı Bekleniyor' }),
            message: t('auction.registrationSubmittedMessage', {
              defaultValue:
                'Katılım talebiniz alındı. Onaylandığında bildirim alacaksınız ve pey verebileceksiniz.',
            }),
            type: 'info',
            confirmText: t('common.ok'),
            onConfirm: () => hideModal(),
          });
        }
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
      showRejectedContactModal();
      return;
    }

    setBiddingLotId(targetLotId);
    setShowComposer(true);
  };

  // Onaylanmayan kullanıcıya müşteri ilişkileri yönergesi (mesaj / ara).
  const showRejectedContactModal = () => {
    showModal({
      title: t('auction.registrationRejectedTitle', { defaultValue: 'Onaylanmadın' }),
      message: t('auction.registrationRejectedContactMessage', {
        defaultValue:
          'Müzayede katılımınız onaylanmadı. Onaylanmak için müşteri ilişkilerine mesaj yazabilir veya arayabilirsiniz.',
      }),
      type: 'error',
      confirmText: t('auction.contactSupportMessage', { defaultValue: 'Mesaj Yaz' }),
      cancelText: t('auction.contactSupportCall', { defaultValue: 'Ara' }),
      onConfirm: () => {
        hideModal();
        router.push('/(tabs)/messages');
      },
      onCancel: () => {
        hideModal();
        Linking.openURL(SUPPORT_PHONE_URL).catch(() => {});
      },
    });
  };

  const handleWithdrawBid = () => {
    if (!activeLotId) return;

    showModal({
      title: t('auction.withdrawBidTitle'),
      message: t('auction.withdrawBidMessage'),
      type: 'info',
      confirmText: t('auction.withdrawBidConfirm'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        try {
          await withdrawBid.mutateAsync({ auctionId: activeLotId });
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

  // Render Time Left for Active Lot
  const renderTimeLeft = () => {
    // Süresiz mod: geri sayım yerine "Süresiz" — kapanışı panelden yönetici verir.
    if (event?.isUntimed) {
      return (
        <View style={styles.timerContainer}>
          <View style={styles.timerTextRow}>
            <Ionicons name="infinite-outline" size={16} color={Colors.slate500} />
            <Text style={styles.timerText}>{t('auction.timeLeftLabel')}:</Text>
          </View>
          <Text style={styles.countdownValue}>
            {t('auctions.untimed', { defaultValue: 'Süresiz' })}
          </Text>
        </View>
      );
    }

    if (!endTime || timeLeftSeconds <= 0) {
      return (
        <View style={styles.timerContainer}>
          <View style={styles.timerTextRow}>
            <Ionicons name="time-outline" size={16} color={Colors.slate500} />
            <Text style={styles.timerText}>{t('auction.timeLeftLabel')}:</Text>
          </View>
          <Text style={[styles.countdownValue, { color: Colors.error }]}>
            {t('auctions.ended')}
          </Text>
        </View>
      );
    }

    const hours = Math.floor(timeLeftSeconds / 3600);
    const minutes = Math.floor((timeLeftSeconds % 3600) / 60);
    const seconds = timeLeftSeconds % 60;

    const pad = (n: number) => String(n).padStart(2, '0');
    const display = hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;

    return (
      <View style={styles.timerContainer}>
        <View style={styles.timerTextRow}>
          <Ionicons name="time-outline" size={16} color={Colors.slate500} />
          <Text style={styles.timerText}>{t('auction.timeLeftLabel')}:</Text>
        </View>
        <Text style={[styles.countdownValue, timeLeftSeconds <= 15 && { color: Colors.error }]}>
          {display}
        </Text>
      </View>
    );
  };

  const isEventActive =
    socket.eventStatus === 'ACTIVE' ||
    (socket.eventStatus === 'UPCOMING' && eventDetails?.event.status === 'ACTIVE');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isEventActive
              ? t('auctions.live', { defaultValue: 'Canlı' })
              : t('auctions.waiting', { defaultValue: 'Bekliyor' })}
          </Text>
        </View>

        <View style={styles.headerMetrics}>
          <View style={styles.metricBadge}>
            <Ionicons name="people-outline" size={14} color={Colors.slate500} />
            <Text style={styles.metricText}>{socket.viewerCount}</Text>
          </View>
          {socket.isConnected ? (
            <View style={[styles.metricBadge, { backgroundColor: `${Colors.auctionGreen}10` }]}>
              <View style={[styles.liveDot, { backgroundColor: Colors.auctionGreen }]} />
              <Text style={[styles.metricText, { color: Colors.auctionGreen }]}>
                {t('auction.connectionLive', { defaultValue: 'Bağlı' })}
              </Text>
            </View>
          ) : (
            <View style={[styles.metricBadge, { backgroundColor: `${Colors.error}10` }]}>
              <View style={[styles.liveDot, { backgroundColor: Colors.error }]} />
              <Text style={[styles.metricText, { color: Colors.error }]}>
                {t('auction.connectionOffline', { defaultValue: 'Bağlantı Kesildi' })}
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Dynamic Center Section - Active Lot or Waiting Banner */}
        {socket.isTransitioning ? (
          <View style={styles.transitionContainer}>
            <View style={styles.transitionCard}>
              <View style={styles.transitionBadge}>
                <View style={[styles.liveDot, { backgroundColor: '#0097D8', width: 8, height: 8, marginRight: 6 }]} />
                <Text style={styles.transitionBadgeText}>
                  {t('auction.nextLotPreparing', { defaultValue: 'SIRADAKİ LOT HAZIRLANIYOR' })}
                </Text>
              </View>
              <Text style={styles.transitionLotNumber}>Lot #{socket.lotNumber}</Text>
              <Text style={styles.transitionLotTitle}>{socket.productTitle}</Text>
              
              <View style={styles.transitionTimerContainer}>
                <Ionicons name="time-outline" size={24} color="#0097D8" style={{ marginRight: 8 }} />
                <Text style={styles.transitionTimerText}>
                  {t('auction.startingInSeconds', { defaultValue: '{{count}} saniye sonra başlıyor', count: transitionLeftSeconds })}
                </Text>
              </View>

              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${Math.min(100, Math.max(0, (transitionLeftSeconds / (socket.transitionSeconds || 30)) * 100))}%` }
                  ]} 
                />
              </View>
            </View>
          </View>
        ) : activeLotId && activeLotDetails ? (
          <View style={styles.activeLotContainer}>
            <View style={styles.activeLotImageContainer}>
              <ProductImageCarousel
                images={activeProduct?.images}
                fallbackImage={getProductImageUri(
                  activeProduct,
                  activeLotDetails.productImage || 'https://placehold.co/100x100',
                )}
                height={240}
              />
              <LiveFeedOverlay items={socket.activityFeed} />
              <View style={styles.activeLotImageBadgeContainer}>
                <View style={[styles.activeLotBadge, isLotEnded && { backgroundColor: Colors.slate400 }]}>
                  <Text style={styles.activeLotBadgeText}>
                    {isLotEnded ? t('auctions.ended') : t('auction.live')}
                  </Text>
                </View>
                {activeLotDetails.lotNumber && (
                  <View style={styles.activeLotNumberBadge}>
                    <Text style={styles.activeLotNumberBadgeText}>Lot #{activeLotDetails.lotNumber}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={{ paddingHorizontal: Spacing.base, paddingBottom: Spacing.base, paddingTop: Spacing.sm }}>
              <Text style={styles.activeLotTitle} numberOfLines={2}>
                {activeLotDetails.productTitle}
              </Text>
              
              <View style={styles.activeLotPriceRow}>
                <View>
                  <Text style={styles.priceLabel}>{t('auction.currentPrice')}</Text>
                  {leadingBidderName && (
                    <Text style={styles.bidderNameSubtext}>
                      {maskBidderName(leadingBidderName)}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                  <Text style={styles.priceValue}>{formatCurrency(currentLotPrice, eventCurrency)}</Text>
                  {bidState === 'leading' && (
                    <View style={styles.leaderBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={Colors.white} />
                      <Text style={styles.leaderBadgeText}>{t('auction.leaderBadge', { defaultValue: 'Lider' })}</Text>
                    </View>
                  )}
                </View>
              </View>

              {renderTimeLeft()}

              {/* Bid Status Feedback Alerts */}
              {bidState === 'leading' && (
                <View style={[styles.statusAlertCard, { backgroundColor: `${Colors.auctionGreen}10` }]}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.auctionGreen} />
                  <Text style={[styles.statusAlertText, { color: Colors.auctionGreen }]}>
                    {t('auction.leaderStateLeading')}
                  </Text>
                </View>
              )}
              {bidState === 'outbid' && (
                <View style={[styles.statusAlertCard, { backgroundColor: `${Colors.error}1A` }]}>
                  <Ionicons name="alert-circle" size={18} color={Colors.error} />
                  <Text style={[styles.statusAlertText, { color: Colors.error }]}>
                    {t('auction.leaderStateOutbid')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.waitingContainer}>
            <Image
              source={{
                uri: event.coverImageUrl || 'https://placehold.co/600x300/F8F9FA/0097D8',
              }}
              style={styles.waitingCover}
            />
            <Text style={styles.waitingTitle}>{event.title}</Text>
            <Text style={styles.waitingTime}>
              {new Date(event.startTime).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <View style={[styles.statusAlertCard, { backgroundColor: Colors.slate100 }]}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.slate500} />
              <Text style={styles.statusAlertText}>
                {t('auctions.waiting', { defaultValue: 'Müzayede henüz başlamadı. Katalogu aşağıdan inceleyebilirsiniz.' })}
              </Text>
            </View>
          </View>
        )}

        {/* Ortak müzayede daveti: davetli kabul/red kararını burada verir */}
        {pendingInvitation ? (
          <View
            style={{
              margin: Spacing.base,
              marginBottom: 0,
              padding: Spacing.base,
              backgroundColor: `${Colors.accent}14`,
              borderRadius: BorderRadius.md,
              borderWidth: 1,
              borderColor: `${Colors.accent}55`,
              gap: Spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="mail-unread" size={18} color={Colors.accent} />
              <Text style={{ fontWeight: '700', color: Colors.onSurface, flex: 1 }}>
                {t('auction.invitationBannerTitle', {
                  defaultValue: 'Bu ortak müzayedeye davetlisiniz',
                })}
              </Text>
            </View>
            <Text style={{ color: Colors.slate500, fontSize: 13 }}>
              {t('auction.invitationBannerBody', {
                defaultValue: 'Kabul ederseniz en az 20 ürünle bu müzayedeye lot ekleyebilirsiniz.',
              })}
            </Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: Colors.primary,
                  borderRadius: BorderRadius.md,
                  paddingVertical: 10,
                  alignItems: 'center',
                }}
                disabled={respondInvitation.isPending}
                onPress={() => handleInvitationResponse('accept')}
                activeOpacity={0.8}
              >
                <Text style={{ color: Colors.white, fontWeight: '700' }}>
                  {t('auction.invitationAccept', { defaultValue: 'Kabul Et' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: Colors.white,
                  borderRadius: BorderRadius.md,
                  borderWidth: 1,
                  borderColor: Colors.error,
                  paddingVertical: 10,
                  alignItems: 'center',
                }}
                disabled={respondInvitation.isPending}
                onPress={() => handleInvitationResponse('reject')}
                activeOpacity={0.8}
              >
                <Text style={{ color: Colors.error, fontWeight: '700' }}>
                  {t('auction.invitationReject', { defaultValue: 'Reddet' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Sub Navigation Segmented Tabs */}
        <View style={styles.subTabContainer}>
          <TouchableOpacity
            style={[styles.subTabButton, activeSubTab === 'catalog' && styles.subTabButtonActive]}
            onPress={() => setActiveSubTab('catalog')}
          >
            <Text style={[styles.subTabText, activeSubTab === 'catalog' && styles.subTabTextActive]}>
              {t('auction.catalogTab', { defaultValue: 'Katalog' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTabButton, activeSubTab === 'feed' && styles.subTabButtonActive]}
            onPress={() => setActiveSubTab('feed')}
          >
            <Text style={[styles.subTabText, activeSubTab === 'feed' && styles.subTabTextActive]}>
              {t('auction.feedTab', { defaultValue: 'Akış' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTabButton, activeSubTab === 'rules' && styles.subTabButtonActive]}
            onPress={() => setActiveSubTab('rules')}
          >
            <Text style={[styles.subTabText, activeSubTab === 'rules' && styles.subTabTextActive]}>
              {t('auction.rulesTab', { defaultValue: 'Şartlar' })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Contents */}
        {activeSubTab === 'catalog' && (
          <View>
            {user && registrationData?.registration ? (
              registrationData.registration.status === 'APPROVED' ? (
                <View
                  style={{
                    backgroundColor: `${Colors.auctionGreen}1A`,
                    borderRadius: BorderRadius.md,
                    paddingVertical: Spacing.sm,
                    paddingHorizontal: Spacing.base,
                    marginBottom: Spacing.sm,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={18} color={Colors.auctionGreen} />
                  <Text style={{ color: Colors.auctionGreen, fontWeight: '700' }}>
                    {t('auction.registrationApprovedBanner', { defaultValue: 'Onaylandın — pey verebilirsin' })}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={
                    registrationData.registration.status === 'REJECTED'
                      ? showRejectedContactModal
                      : undefined
                  }
                  activeOpacity={0.8}
                  style={{
                    backgroundColor:
                      registrationData.registration.status === 'REJECTED'
                        ? `${Colors.error}1A`
                        : `${Colors.accent}1A`,
                    borderRadius: BorderRadius.md,
                    paddingVertical: Spacing.sm,
                    paddingHorizontal: Spacing.base,
                    marginBottom: Spacing.sm,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Ionicons
                    name={
                      registrationData.registration.status === 'REJECTED'
                        ? 'close-circle'
                        : 'time'
                    }
                    size={18}
                    color={
                      registrationData.registration.status === 'REJECTED'
                        ? Colors.error
                        : Colors.accent
                    }
                  />
                  <Text
                    style={{
                      color:
                        registrationData.registration.status === 'REJECTED'
                          ? Colors.error
                          : Colors.accent,
                      fontWeight: '700',
                    }}
                  >
                    {registrationData.registration.status === 'REJECTED'
                      ? t('auction.registrationRejectedBanner', {
                          defaultValue: 'Onaylanmadın — müşteri ilişkileriyle iletişime geç',
                        })
                      : t('auction.registrationPendingBanner', {
                          defaultValue: 'Onay bekleniyor',
                        })}
                  </Text>
                </TouchableOpacity>
              )
            ) : null}

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.sm }}>
              {([
                { key: 'lot', label: t('auction.sortByLot', { defaultValue: 'Lot Sırası' }) },
                { key: 'priceAsc', label: t('auction.sortByPriceAsc', { defaultValue: 'Fiyat Artan' }) },
                { key: 'priceDesc', label: t('auction.sortByPriceDesc', { defaultValue: 'Fiyat Azalan' }) },
              ] as const).map((option) => (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => setCatalogSort(option.key)}
                  activeOpacity={0.8}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor:
                      catalogSort === option.key ? Colors.primary : Colors.slate100,
                  }}
                >
                  <Text
                    style={{
                      color: catalogSort === option.key ? Colors.white : Colors.slate500,
                      fontWeight: '600',
                      fontSize: 12,
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(catalogSort === 'lot'
              ? sortedLots
              : [...(lots || [])].sort((a, b) =>
                  catalogSort === 'priceAsc'
                    ? Number(a.currentPrice) - Number(b.currentPrice)
                    : Number(b.currentPrice) - Number(a.currentPrice),
                )
            ).map((lot, index) => {
              const isTimeEnded = lot.endTime ? new Date(lot.endTime).getTime() <= getSynchronizedTime() : false;
              const isLotEnded = lot.status === AuctionStatus.ENDED || lot.status === AuctionStatus.COMPLETED || isTimeEnded;
              const isLotActive = lot.id === activeLotId && !isLotEnded;

              return (
                <TouchableOpacity
                  key={lot.id}
                  style={[styles.lotItem, isLotActive && styles.lotItemActive]}
                  onPress={() => setSelectedLotForPreview(lot.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.lotSeqContainer}>
                    <Text style={[styles.lotSeqText, isLotActive && styles.lotSeqTextActive]}>
                      #{lot.sequenceNumber ?? (index + 1)}
                    </Text>
                  </View>
                  <Image
                    source={{ uri: lot.productImage || 'https://placehold.co/100x100' }}
                    style={styles.lotThumb}
                  />
                  <View style={styles.lotDetails}>
                    <View style={styles.lotTitleRow}>
                      <Text style={styles.lotItemTitle} numberOfLines={1}>
                        {lot.productTitle}
                      </Text>
                      <Text style={styles.lotPrice}>
                        {formatCurrency(Number(lot.currentPrice), eventCurrency)}
                      </Text>
                    </View>
                    <View style={styles.lotStatusRow}>
                      {isLotActive ? (
                        <View style={[styles.lotStatusBadge, { backgroundColor: `${Colors.error}1A` }]}>
                          <Text style={[styles.lotStatusText, { color: Colors.error }]}>
                            {t('auctions.live')}
                          </Text>
                        </View>
                      ) : isLotEnded ? (
                        <View style={[styles.lotStatusBadge, { backgroundColor: Colors.slate100 }]}>
                          <Text style={[styles.lotStatusText, { color: Colors.slate500 }]}>
                            {t('auctions.ended')}
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.lotStatusBadge, { backgroundColor: `${Colors.accent}1A` }]}>
                          <Text style={[styles.lotStatusText, { color: Colors.accent }]}>
                            {t('auctions.waiting')}
                          </Text>
                        </View>
                      )}
                      {lot.lotNumber && (
                        <Text style={styles.lotNumberText}>Lot: {lot.lotNumber}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {activeSubTab === 'feed' && (
          <View style={styles.feedContainer}>
            {!socket.activityFeed || socket.activityFeed.length === 0 ? (
              <View style={styles.feedEmpty}>
                <Ionicons name="chatbubbles-outline" size={36} color={Colors.slate300} />
                <Text style={styles.feedEmptyText}>
                  {t('auction.noBidsYet', { defaultValue: 'Canlı hareket bulunmuyor.' })}
                </Text>
              </View>
            ) : (
              socket.activityFeed.map((item) => {
                const getToneColor = () => {
                  if (item.tone === 'accent') return Colors.auctionGreen;
                  if (item.tone === 'error') return Colors.error;
                  return Colors.slate600;
                };

                return (
                  <View key={item.id} style={styles.feedItem}>
                    <View style={[styles.feedIcon, { backgroundColor: `${getToneColor()}1A` }]}>
                      <Ionicons
                        name={
                          item.tone === 'accent'
                            ? 'hammer'
                            : item.tone === 'error'
                            ? 'warning'
                            : 'chatbubble-ellipses'
                        }
                        size={14}
                        color={getToneColor()}
                      />
                    </View>
                    <View style={styles.feedContent}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.feedTitle, { color: getToneColor(), flexShrink: 1 }]}>
                          {item.title}
                        </Text>
                        <Text style={{ fontSize: 11, color: Colors.slate400, marginLeft: 8 }}>
                          {new Date(item.at).toLocaleTimeString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <Text style={styles.feedBody}>{item.body}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeSubTab === 'rules' && (
          <View style={{ padding: Spacing.base }}>
            <Text style={{ fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.body, marginBottom: 8 }}>
              {t('legal.auctionTerms.sections.general.title', { defaultValue: 'Genel Kurallar' })}
            </Text>
            <Text style={{ fontFamily: FontFamily.body, color: Colors.slate600, fontSize: FontSize.caption, marginBottom: Spacing.base }}>
              {t('legal.auctionTerms.sections.general.body1', { defaultValue: 'Müzayedeler platform tarafından organize edilen tematik etkinlikler olarak gerçekleştirilir.' })}
            </Text>
            <Text style={{ fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.body, marginBottom: 8 }}>
              {t('legal.auctionTerms.sections.bidding.title', { defaultValue: 'Teklif ve Artış Politikası' })}
            </Text>
            <Text style={{ fontFamily: FontFamily.body, color: Colors.slate600, fontSize: FontSize.caption, marginBottom: Spacing.base }}>
              {t('legal.auctionTerms.sections.bidding.body1', { defaultValue: 'Son saniyelerde gelen teklifler müzayede süresini otomatik uzatır.' })}
            </Text>
            <Text style={{ fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.body, marginBottom: 8 }}>
              {t('legal.auctionTerms.sections.wallet.title', { defaultValue: 'Ödeme ve Blokaj' })}
            </Text>
            <Text style={{ fontFamily: FontFamily.body, color: Colors.slate600, fontSize: FontSize.caption }}>
              {t('legal.auctionTerms.sections.wallet.body1', { defaultValue: 'Teklif vermek için tahmini toplam tutar cüzdanınızda bloke edilir.' })}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Place Bid Composer Bar or Admin Skip Lot Bar */}
      {activeLotId && activeLotDetails && !socket.isTransitioning && (
        <View style={styles.stickyComposer}>
          {!isSeller ? (
            <>
              <TouchableOpacity
                style={[
                  styles.openComposerButton,
                  isBidLocked && { backgroundColor: Colors.slate400, opacity: 0.6 }
                ]}
                onPress={() => handleOpenComposerClick(activeLotId, true)}
                activeOpacity={0.85}
              >
                <Text style={styles.openComposerButtonText}>{t('auction.placeBid')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.lockButton,
                  !isBidLocked && { backgroundColor: `${Colors.primary}10`, borderColor: Colors.primary }
                ]}
                onPress={async () => {
                  if (isBidLocked) {
                    setIsBidLocked(false);
                    try {
                      await SecureStore.setItemAsync('endemigo_bid_lock_disabled', 'true');
                    } catch (err) {
                      console.error('Failed to write lock status to SecureStore:', err);
                    }
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isBidLocked ? "lock-closed" : "lock-open"}
                  size={20}
                  color={isBidLocked ? Colors.slate500 : Colors.primary}
                />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.openComposerButton, { backgroundColor: Colors.slate400 }]}
              disabled={true}
            >
              <Text style={styles.openComposerButtonText}>
                {t('auction.ownerModeButton', { defaultValue: 'Teklif Kapalı' })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Bid Compose Modal */}
      <Modal
        visible={showComposer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { setShowComposer(false); setBiddingLotId(null); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackgroundClose}
            activeOpacity={1}
            onPress={() => { setShowComposer(false); setBiddingLotId(null); }}
          />
          <View style={styles.modalContent}>
            {biddingLotDetails && (
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
                  amount: formatCurrency(minBid, eventCurrency),
                })}
                disabled={placeBid.isPending || isBidInvalid || isWalletGateClosed}
                isPending={placeBid.isPending}
                onSubmit={handleBid}
                onClose={() => { setShowComposer(false); setBiddingLotId(null); }}
                t={t}
                lotTitle={biddingLotDetails?.productTitle}
                lotNumber={biddingLotDetails?.lotNumber}
                isPreBid={isPreBid}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Lot Preview Modal */}
      <Modal
        visible={selectedLotForPreview !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedLotForPreview(null)}
      >
        <View style={{ flex: 1, backgroundColor: Colors.white, paddingTop: insets.top }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t('moreDetails', { defaultValue: 'Ürün Detayları' })}
            </Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedLotForPreview(null)}>
              <Ionicons name="close" size={20} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>

          {previewedLot && (
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.imageContainer}>
                  <ProductImageCarousel
                    images={previewedProduct?.images}
                    fallbackImage={previewedLot.productImage || 'https://placehold.co/300x150'}
                    height={280}
                  />
                  {previewedLot.sequenceNumber && (
                    <View style={styles.imageBadge}>
                      <Text style={styles.imageBadgeText}>#{previewedLot.sequenceNumber}</Text>
                    </View>
                  )}
                </View>

                <View style={{ paddingHorizontal: Spacing.base, paddingBottom: Spacing.xl }}>
                  <Text style={styles.previewTitle}>
                    {previewedLot.productTitle}
                  </Text>

                  <View style={styles.badgesContainer}>
                    <View style={styles.detailBadge}>
                      <Ionicons name="bookmark-outline" size={14} color={Colors.slate500} />
                      <Text style={styles.detailBadgeText}>
                        Lot: {previewedLot.lotNumber || '-'}
                      </Text>
                    </View>
                    {isPreviewedLotEnded ? (
                      <View style={styles.detailBadge}>
                        <Ionicons name="trophy-outline" size={14} color={Colors.secondary} />
                        <Text style={styles.detailBadgeText}>
                          {t('auction.finalPrice')}: <Text style={[styles.detailBadgePriceText, { color: Colors.secondary }]}>{formatCurrency(Number(previewedLot.currentPrice), eventCurrency)}</Text>
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.detailBadge}>
                        <Ionicons name="cash-outline" size={14} color={Colors.auctionGreen} />
                        <Text style={styles.detailBadgeText}>
                          {t('auction.openingPrice')}: <Text style={styles.detailBadgePriceText}>{formatCurrency(Number(previewedLot.startPrice), eventCurrency)}</Text>
                        </Text>
                      </View>
                    )}
                  </View>

                  {previewedProduct ? (
                    <View>
                      {isPreviewedLotEnded && (
                        <View style={{
                          backgroundColor: `${Colors.secondary}10`,
                          borderRadius: BorderRadius.xl,
                          padding: Spacing.base,
                          marginBottom: Spacing.base,
                          borderWidth: 1,
                          borderColor: `${Colors.secondary}30`,
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
                            <Ionicons name="trophy" size={18} color={Colors.secondary} />
                            <Text style={{ fontSize: FontSize.bodyXl, fontFamily: FontFamily.bodyBold, color: Colors.secondary, fontWeight: '700' }}>
                              {t('auction.resultTitleEnded', { defaultValue: 'Müzayede Sonucu' })}
                            </Text>
                          </View>

                          {previewedResult ? (
                            <View style={{ gap: Spacing.sm }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: FontSize.body, fontFamily: FontFamily.body, color: Colors.slate500 }}>
                                  {t('auction.finalPrice', { defaultValue: 'Son Fiyat' })}:
                                </Text>
                                <Text style={{ fontSize: FontSize.bodyXl, fontFamily: FontFamily.price, color: Colors.onSurface, fontWeight: '700' }}>
                                  {formatCurrency(previewedResult.finalPrice, eventCurrency)}
                                </Text>
                              </View>
                              
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: FontSize.body, fontFamily: FontFamily.body, color: Colors.slate500 }}>
                                  {t('auction.totalBids', { defaultValue: 'Toplam Pey' })}:
                                </Text>
                                <Text style={{ fontSize: FontSize.body, fontFamily: FontFamily.bodySemiBold, color: Colors.onSurface }}>
                                  {previewedResult.bidCount}
                                </Text>
                              </View>

                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: FontSize.body, fontFamily: FontFamily.body, color: Colors.slate500 }}>
                                  {t('auction.winner', { defaultValue: 'Kazanan' })}:
                                </Text>
                                {previewedResult.winner ? (
                                  <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                    backgroundColor: Colors.slate50,
                                    paddingHorizontal: Spacing.sm,
                                    paddingVertical: 4,
                                    borderRadius: BorderRadius.md,
                                  }}>
                                    <Ionicons name="person" size={12} color={Colors.slate500} />
                                    <Text style={{ fontSize: FontSize.body, fontFamily: FontFamily.bodySemiBold, color: Colors.slate700 }}>
                                      {previewedResult.winner.id === user?.id
                                        ? t('auction.you', { defaultValue: 'Siz' })
                                        : maskBidderName(previewedResult.winner.name)}
                                    </Text>
                                  </View>
                                ) : (
                                  <Text style={{ fontSize: FontSize.body, fontFamily: FontFamily.bodyMedium, color: Colors.slate500 }}>
                                    {t('auction.resultTitleNoBid', { defaultValue: 'Teklif Alınamadı' })}
                                  </Text>
                                )}
                              </View>
                            </View>
                          ) : (
                            <ActivityIndicator size="small" color={Colors.secondary} />
                          )}
                        </View>
                      )}

                      <Text style={styles.sectionHeader}>
                        {t('product.descriptionTitle', { defaultValue: 'Ürün Açıklaması' })}
                      </Text>
                      <Text style={styles.descriptionText}>
                        {previewedProduct.description || t('product.noDescription', { defaultValue: 'Açıklama bulunmuyor.' })}
                      </Text>

                      <Text style={styles.sectionHeader}>
                        {t('product.specifications', { defaultValue: 'Özellikler' })}
                      </Text>
                      
                      <View style={styles.specGrid}>
                        <View style={styles.specTile}>
                          <Text style={styles.specTileLabel}>
                            {t('auction.categoryLabel', { defaultValue: 'Kategori' })}
                          </Text>
                          <Text style={styles.specTileValue} numberOfLines={1}>
                            {previewedProduct.categoryName || '-'}
                          </Text>
                        </View>

                        <View style={styles.specTile}>
                          <Text style={styles.specTileLabel}>
                            {t('auction.conditionLabel', { defaultValue: 'Durum' })}
                          </Text>
                          <Text style={styles.specTileValue} numberOfLines={1}>
                            {getAuctionConditionLabel(previewedProduct.condition, t)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <ActivityIndicator size="small" color={Colors.auctionGreen} style={{ marginVertical: Spacing.xl }} />
                  )}
                </View>
              </ScrollView>
            )}
          {previewedLot && !isPreviewedLotEnded && user?.id !== previewedLot.sellerId && (
            <View style={[styles.previewFooter, { paddingBottom: Math.max(Spacing.md, insets.bottom) }]}>
              <TouchableOpacity
                style={styles.previewPreBidButton}
                onPress={() => {
                  setSelectedLotForPreview(null);
                  handleOpenComposerClick(previewedLot.id, false);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.previewPreBidButtonText}>
                  {t('auction.placePreBid', { defaultValue: 'Ön Teklif Ver' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
                    auctionId: biddingLotId ?? activeLotId ?? '',
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
              requiredDeposit={Number(biddingLotDetails?.requiredDeposit ?? 0)}
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
                    auctionId: biddingLotId ?? activeLotId ?? '',
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
              requiredDeposit={Number(biddingLotDetails?.requiredDeposit ?? 0)}
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
    </SafeAreaView>
  );
}
