import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuctionPaymentStatus } from '@endemigo/shared';
import { useCompleteAuctionPayment, useAuctionResult } from '../../../hooks/useAuctions';
import { useAuthStore } from '../../../store/authStore';
import { useModalStore } from '../../../store/modalStore';
import { Colors } from '../../../constants/theme';
import { formatCurrency } from '../../../utils/transactionFormatters';
import { resolveApiErrorMessage } from '../../../utils/apiError';
import { styles } from '../../../styles/auction/id/result.styles';

export default function AuctionResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { showModal } = useModalStore();
  const { data: result, isLoading } = useAuctionResult(id);
  const completeAuctionPayment = useCompleteAuctionPayment();

  if (isLoading || !result) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.auctionGreen} />
      </View>
    );
  }

  const isWinner = result.winner?.id === user?.id;
  const hasWinner = Boolean(result.winner);
  const paymentStatus = result.paymentStatus ?? AuctionPaymentStatus.NONE;
  const isPaymentPending = paymentStatus === AuctionPaymentStatus.PENDING;
  const isPaymentPaid = paymentStatus === AuctionPaymentStatus.PAID;
  const isReserveUnmet =
    result.status === 'FAILED'
    && result.bidCount > 0
    && result.reservePrice !== null
    && result.reservePrice !== undefined
    && result.reserveMet === false;
  const totalCost = result.finalPrice + result.buyerPremium;
  const priceLabel = hasWinner
    ? t('auction.finalPrice')
    : result.bidCount > 0
      ? t('auction.resultHighestBidLabel')
      : t('auction.openingPrice');
  const title = isWinner
    ? t('auction.resultTitleWinner')
    : isReserveUnmet
      ? t('auction.resultTitleReserveNotMet')
      : hasWinner
        ? t('auction.resultTitleEnded')
        : t('auction.resultTitleNoBid');
  const summaryMessage = isWinner
    ? t('auction.resultWinnerSummary', { amount: formatCurrency(result.finalPrice) })
    : isReserveUnmet
      ? t('auction.resultReserveNotMetMessage', {
          amount: formatCurrency(result.reservePrice ?? 0),
        })
      : hasWinner
        ? t('auction.resultEndedMessage')
        : t('auction.resultNoBidMessage');
  // Satış onayı (admin/organizatör) verilmeden ödeme açılmaz.
  const isSaleApproved = Boolean((result as { saleApprovedAt?: string | null }).saleApprovedAt);
  const paymentSummary = isPaymentPending
    ? isWinner
      ? isSaleApproved
        ? t('auction.paymentPendingWinnerMessage')
        : t('auction.saleApprovalPendingMessage', {
            defaultValue:
              'Müzayede kontrolleri sürüyor. Satış onaylandığında ödeme sepetinize açılacak ve bildirim alacaksınız.',
          })
      : t('auction.paymentPendingObserverMessage')
    : isPaymentPaid
      ? t('auction.paymentPaidMessage')
      : paymentStatus === AuctionPaymentStatus.EXPIRED
        ? t('auction.paymentExpiredMessage')
        : null;
  const paymentDeadlineLabel = result.paymentDeadlineAt
    ? new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'tr-TR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(result.paymentDeadlineAt))
    : null;

  const handleCompletePayment = async () => {
    try {
      // Ödeme sepet üzerinden kredi kartıyla yapılır; backend ürünün
      // sepette olduğunu garanti eder.
      await completeAuctionPayment.mutateAsync({ auctionId: id });
      showModal({
        title: t('auction.paymentViaCartTitle', { defaultValue: 'Ürün Sepetinizde' }),
        message: t('auction.paymentViaCartMessage', {
          defaultValue: 'Kazandığınız ürün sepetinize eklendi. Ödemeyi sepetten kredi kartınızla tamamlayabilirsiniz.',
        }),
        type: 'success',
        confirmText: t('auction.goToCart', { defaultValue: 'Sepete Git' }),
        onConfirm: () => {
          router.replace('/cart');
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

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>

      {/* Icon */}
      <View
        style={[
          styles.iconCircle,
          isWinner
            ? styles.iconCircleWinner
            : isReserveUnmet
              ? styles.iconCircleReserveFailed
              : result.winner
                ? styles.iconCircleEnded
                : styles.iconCircleEmpty,
        ]}
      >
        <Ionicons
          name={
            isWinner
              ? 'trophy'
              : isReserveUnmet
                ? 'alert-circle'
                : result.winner
                  ? 'close-circle'
                  : 'stop-circle'
          }
          size={56}
          color={
            isWinner
              ? Colors.secondary
              : isReserveUnmet
                ? Colors.error
                : result.winner
                  ? Colors.auctionGreen
                  : Colors.slate500
          }
        />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        {result.product?.title || t('auction.resultProductFallback')}
      </Text>
      <Text style={styles.stateMessage}>{summaryMessage}</Text>

      {/* Result Card */}
      <View style={styles.resultCard}>
        <View style={styles.row}>
          <Text style={styles.label}>{priceLabel}</Text>
          <Text style={styles.value}>{formatCurrency(result.finalPrice)}</Text>
        </View>
        {result.reservePrice !== null && result.reservePrice !== undefined ? (
          <View style={styles.row}>
            <Text style={styles.label}>{t('auction.ruleReserve')}</Text>
            <Text style={styles.value}>
              {t('auction.reserveDetail', {
                amount: formatCurrency(result.reservePrice),
                status: result.reserveMet
                  ? t('auction.reserveMet')
                  : t('auction.reserveNotMet'),
              })}
            </Text>
          </View>
        ) : null}

        <View style={styles.row}>
          <Text style={styles.label}>{t('auction.totalBids')}</Text>
          <Text style={styles.value}>{result.bidCount}</Text>
        </View>
        {result.winner && (
          <View style={styles.row}>
            <Text style={styles.label}>{t('auction.winner')}</Text>
            <View style={[styles.winnerBadge, isWinner && styles.winnerBadgeActive]}>
              <Ionicons
                name={isWinner ? 'trophy' : 'person'}
                size={14}
                color={isWinner ? Colors.secondary : Colors.onSurfaceVariant}
              />
              <Text style={[styles.winnerText, isWinner && styles.winnerTextActive]}>
                {isWinner ? t('auction.you') : result.winner.name}
              </Text>
            </View>
          </View>
        )}
      </View>

      {paymentSummary ? (
        <View style={styles.settlementCard}>
          <View style={styles.row}>
            <Text style={styles.label}>{t('auction.paymentStatusLabel')}</Text>
            <Text style={styles.value}>{t(`auction.paymentStatuses.${paymentStatus}`)}</Text>
          </View>
          <Text style={styles.stateMessage}>{paymentSummary}</Text>
          {paymentDeadlineLabel ? (
            <View style={styles.row}>
              <Text style={styles.label}>{t('auction.paymentDeadlineLabel')}</Text>
              <Text style={styles.value}>{paymentDeadlineLabel}</Text>
            </View>
          ) : null}
          {isPaymentPending && isWinner && isSaleApproved ? (
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={handleCompletePayment}
              activeOpacity={0.8}
              disabled={completeAuctionPayment.isPending}
            >
              {completeAuctionPayment.isPending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="card" size={18} color={Colors.white} />
                  <Text style={styles.primaryActionText}>
                    {t('auction.completePayment')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
          {isPaymentPaid && result.orderId ? (
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/orders/[orderId]',
                  params: { orderId: result.orderId ?? '' },
                })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryActionText}>
                {t('auction.viewOrder')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => router.replace('/(tabs)/auctions')}
        activeOpacity={0.8}
      >
        <Ionicons name="hammer" size={20} color={Colors.white} />
        <Text style={styles.homeButtonText}>{t('auction.backToAuctions')}</Text>
      </TouchableOpacity>
    </View>
  );
}
