import { useEffect, useState, useCallback, useRef } from 'react';
import { Vibration } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Socket } from 'socket.io-client';
import { getAuctionSocket } from '../services/socket';
import ENV from '../lib/config';
import { useModalStore } from '../store/modalStore';
import { formatAmount } from '../utils/transactionFormatters';

interface AuctionEventSocketState {
  eventStatus: string;
  activeLotId: string | null;
  lotNumber: string | null;
  productTitle: string | null;
  currentPrice: number;
  bidCount: number;
  endTime: string;
  serverTime: string;
  viewerCount: number;
  isConnected: boolean;
  lastBid: { amount: number; bidderName: string } | null;
  activityFeed: {
    id: string;
    title: string;
    body: string;
    tone: 'accent' | 'error' | 'primary';
  }[];
  wasOutbid: boolean;
  lotEnded: boolean;
  isWinner: boolean;
  finalPrice: number | null;
  isTransitioning: boolean;
  transitionSeconds: number;
  transitionEndTime: string | null;
  nextLotId: string | null;
}

export function useAuctionEventSocket(eventId: string) {
  const { t } = useTranslation();
  const showModal = useModalStore((modalState) => modalState.showModal);
  const [state, setState] = useState<AuctionEventSocketState>({
    eventStatus: 'UPCOMING',
    activeLotId: null,
    lotNumber: null,
    productTitle: null,
    currentPrice: 0,
    bidCount: 0,
    endTime: '',
    serverTime: '',
    viewerCount: 0,
    isConnected: false,
    lastBid: null,
    activityFeed: [],
    wasOutbid: false,
    lotEnded: false,
    isWinner: false,
    finalPrice: null,
    isTransitioning: false,
    transitionSeconds: 30,
    transitionEndTime: null,
    nextLotId: null,
  });

  const socketRef = useRef<Socket | null>(null);
  // Mirror of state.activeLotId so socket handlers can gate side effects
  // (modal/vibration) WITHOUT running them inside a setState updater.
  const activeLotIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeLotIdRef.current = state.activeLotId;
  }, [state.activeLotId]);

  useEffect(() => {
    if (ENV.USE_MOCK) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const connect = async () => {
      const socket = await getAuctionSocket();
      if (cancelled) return;
      socketRef.current = socket;

      const appendActivity = (
        title: string,
        body: string,
        tone: 'accent' | 'error' | 'primary' = 'primary',
      ) => {
        setState((currentState) => ({
          ...currentState,
          activityFeed: [
            {
              id: `${Date.now()}-${Math.random()}`,
              title,
              body,
              tone,
            },
            ...currentState.activityFeed,
          ].slice(0, 5),
        }));
      };

      const onConnect = () => {
        setState((s) => ({ ...s, isConnected: true }));
        socket.emit('event:join', { eventId });
      };
      const onDisconnect = () => setState((s) => ({ ...s, isConnected: false }));

      const onEventJoined = (data: { eventId: string; viewerCount: number; serverTime?: string }) => {
        if (data.eventId === eventId) {
          setState((s) => ({
            ...s,
            viewerCount: data.viewerCount,
            serverTime: data.serverTime ?? s.serverTime,
          }));
          appendActivity(
            t('auction.activityEventJoinedTitle', { defaultValue: 'Müzayede Odası' }),
            t('auction.activityEventJoinedBody', { defaultValue: 'Ortak canlı müzayede odasına başarıyla bağlandınız.' }),
            'primary',
          );
        }
      };

      const onEventViewerCount = (data: { eventId: string; count: number; serverTime?: string }) => {
        if (data.eventId === eventId) {
          setState((s) => ({
            ...s,
            viewerCount: data.count,
            serverTime: data.serverTime ?? s.serverTime,
          }));
        }
      };

      const onEventStatusChanged = (data: { eventId: string; status: string; serverTime?: string }) => {
        if (data.eventId === eventId) {
          setState((s) => ({
            ...s,
            eventStatus: data.status,
            serverTime: data.serverTime ?? s.serverTime,
          }));
          const label = data.status === 'PAUSED'
            ? t('auction.eventPausedLabel', { defaultValue: 'DURAKLATILDI' })
            : t('auction.eventActiveLabel', { defaultValue: 'CANLI' });
          appendActivity(
            t('auction.eventStatusChangedTitle', { defaultValue: 'Müzayede Durumu' }),
            t('auction.eventStatusChangedBody', { defaultValue: 'Müzayede akışı şu an: {{label}}', label }),
            data.status === 'PAUSED' ? 'error' : 'accent',
          );
        }
      };

      const onActiveLotChanged = (data: {
        eventId: string;
        activeLotId: string | null;
        lotNumber: string | null;
        productTitle: string | null;
        currentPrice: number;
        endTime: string;
        serverTime?: string;
      }) => {
        if (data.eventId !== eventId) return;
        // Keep the ref immediately current so bid events for the new lot that
        // arrive before the next render are gated correctly.
        activeLotIdRef.current = data.activeLotId;
        if (data.activeLotId) {
          Vibration.vibrate(150);
          appendActivity(
            t('auction.newLotActiveTitle', { defaultValue: 'Yeni Lot İhalede!' }),
            t('auction.newLotActiveBody', {
              defaultValue: 'Lot #{{num}}: {{title}} başladı.',
              num: data.lotNumber,
              title: data.productTitle,
            }),
            'accent',
          );
        }
        setState((s) => ({
          ...s,
          activeLotId: data.activeLotId,
          lotNumber: data.lotNumber,
          productTitle: data.productTitle,
          currentPrice: data.currentPrice,
          endTime: data.endTime,
          serverTime: data.serverTime ?? s.serverTime,
          bidCount: 0,
          lastBid: null,
          lotEnded: false,
          isWinner: false,
          finalPrice: null,
          isTransitioning: false,
          nextLotId: null,
        }));
      };

      const onLotTransition = (data: {
        eventId: string;
        nextLotId: string | null;
        lotNumber: string | null;
        productTitle: string | null;
        transitionSeconds: number;
        transitionEndTime: string;
        serverTime?: string;
      }) => {
        if (data.eventId === eventId) {
          setState((s) => ({
            ...s,
            isTransitioning: true,
            transitionSeconds: data.transitionSeconds,
            transitionEndTime: data.transitionEndTime,
            nextLotId: data.nextLotId,
            lotNumber: data.lotNumber,
            productTitle: data.productTitle,
            serverTime: data.serverTime ?? s.serverTime,
          }));
          appendActivity(
            t('auction.transitionStartedTitle', { defaultValue: 'Sıradaki Lot Hazırlanıyor' }),
            t('auction.transitionStartedBody', {
              defaultValue: 'Lot #{{num}}: {{title}} için bekleme süresi başladı.',
              num: data.lotNumber,
              title: data.productTitle,
            }),
            'primary',
          );
        }
      };

      const onBidNew = (data: {
        auctionId: string;
        currentPrice: number;
        bidCount: number;
        endTime: string;
        serverTime: string;
        amount: number;
        bidderName: string;
      }) => {
        if (activeLotIdRef.current === data.auctionId) {
          setState((s) => ({
            ...s,
            currentPrice: data.currentPrice,
            bidCount: data.bidCount,
            endTime: data.endTime,
            serverTime: data.serverTime,
            lastBid: { amount: data.amount, bidderName: data.bidderName },
          }));
        }
        appendActivity(
          t('auction.activityBidTitle'),
          t('auction.latestBidMessage', {
            bidder: data.bidderName,
            amount: formatAmount(data.amount),
          }),
          'accent',
        );
      };

      const onBidOutbid = (data: { auctionId: string; newAmount: number; serverTime?: string }) => {
        if (activeLotIdRef.current !== data.auctionId) return;
        Vibration.vibrate(200);
        showModal({
          title: t('auction.outbidTitle'),
          message: t('auction.outbidMessage', {
            amount: formatAmount(data.newAmount),
          }),
          type: 'info',
        });
        setState((s) => ({
          ...s,
          wasOutbid: true,
          serverTime: data.serverTime ?? s.serverTime,
        }));
      };

      const onBidWinner = (data: { auctionId: string; finalPrice: number; serverTime?: string }) => {
        if (activeLotIdRef.current !== data.auctionId) return;
        Vibration.vibrate([0, 200, 100, 200]);
        setState((s) => ({
          ...s,
          isWinner: true,
          lotEnded: true,
          finalPrice: data.finalPrice,
          serverTime: data.serverTime ?? s.serverTime,
        }));
      };

      const onBidLost = (data: { auctionId: string; finalPrice: number; serverTime?: string }) => {
        if (activeLotIdRef.current !== data.auctionId) return;
        setState((s) => ({
          ...s,
          isWinner: false,
          lotEnded: true,
          finalPrice: data.finalPrice,
          serverTime: data.serverTime ?? s.serverTime,
        }));
      };

      const onAuctionExtended = (data: { auctionId: string; newEndTime: string; extensionNumber: number; serverTime?: string }) => {
        if (activeLotIdRef.current === data.auctionId) {
          setState((s) => ({
            ...s,
            endTime: data.newEndTime,
            serverTime: data.serverTime ?? s.serverTime,
          }));
        }
        appendActivity(
          t('auction.extendedTitle'),
          t('auction.extendedMessage', {
            count: data.extensionNumber,
          }),
          'primary',
        );
      };

      const onAuctionEnded = (data: { auctionId: string; finalPrice: number; bidCount?: number; serverTime?: string }) => {
        if (activeLotIdRef.current !== data.auctionId) return;
        setState((s) => ({
          ...s,
          lotEnded: true,
          finalPrice: data.finalPrice,
          bidCount: data.bidCount ?? s.bidCount,
          serverTime: data.serverTime ?? s.serverTime,
        }));
      };

      const onAuctionWarning = (data: { auctionId: string; serverTime?: string }) => {
        if (activeLotIdRef.current === data.auctionId) {
          Vibration.vibrate(100);
          setState((s) => ({
            ...s,
            serverTime: data.serverTime ?? s.serverTime,
          }));
        }
        appendActivity(
          t('auction.activityWarningTitle'),
          t('auction.activityWarningBody'),
          'primary',
        );
      };

      const onAuctionCancelled = (data: { auctionId: string; reason: string; serverTime?: string }) => {
        if (activeLotIdRef.current !== data.auctionId) return;
        showModal({
          title: t('auction.cancelledTitle'),
          message: data.reason || t('auction.cancelledMessage'),
          type: 'error',
        });
        setState((s) => ({
          ...s,
          lotEnded: true,
          serverTime: data.serverTime ?? s.serverTime,
        }));
      };

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('event:joined', onEventJoined);
      socket.on('event:viewer_count', onEventViewerCount);
      socket.on('event:status_changed', onEventStatusChanged);
      socket.on('event:active_lot_changed', onActiveLotChanged);
      socket.on('event:lot_transition', onLotTransition);
      socket.on('bid:new', onBidNew);
      socket.on('bid:outbid', onBidOutbid);
      socket.on('bid:winner', onBidWinner);
      socket.on('bid:lost', onBidLost);
      socket.on('auction:extended', onAuctionExtended);
      socket.on('auction:ended', onAuctionEnded);
      socket.on('auction:warning', onAuctionWarning);
      socket.on('auction:cancelled', onAuctionCancelled);

      if (socket.connected) {
        onConnect();
      }

      // Detach only this hook's handlers — the socket is shared, so a bare
      // socket.off(event) would also remove other screens' listeners.
      cleanup = () => {
        socket.emit('event:leave', { eventId });
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('event:joined', onEventJoined);
        socket.off('event:viewer_count', onEventViewerCount);
        socket.off('event:status_changed', onEventStatusChanged);
        socket.off('event:active_lot_changed', onActiveLotChanged);
        socket.off('event:lot_transition', onLotTransition);
        socket.off('bid:new', onBidNew);
        socket.off('bid:outbid', onBidOutbid);
        socket.off('bid:winner', onBidWinner);
        socket.off('bid:lost', onBidLost);
        socket.off('auction:extended', onAuctionExtended);
        socket.off('auction:ended', onAuctionEnded);
        socket.off('auction:warning', onAuctionWarning);
        socket.off('auction:cancelled', onAuctionCancelled);
      };
    };

    connect();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [eventId, showModal, t]);

  const clearOutbid = useCallback(() => {
    setState((s) => ({ ...s, wasOutbid: false }));
  }, []);

  return { ...state, clearOutbid };
}
