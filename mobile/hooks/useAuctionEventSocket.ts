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
  });

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (ENV.USE_MOCK) return;

    let cancelled = false;

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

      // Ortak Müzayede Odasına Katıl
      socket.emit('event:join', { eventId });

      const onConnect = () => setState((s) => ({ ...s, isConnected: true }));
      const onDisconnect = () => setState((s) => ({ ...s, isConnected: false }));

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);

      if (socket.connected) {
        setState((s) => ({ ...s, isConnected: true }));
      }

      socket.on('event:joined', (data: { eventId: string; viewerCount: number; serverTime?: string }) => {
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
      });

      socket.on('event:viewer_count', (data: { eventId: string; count: number; serverTime?: string }) => {
        if (data.eventId === eventId) {
          setState((s) => ({
            ...s,
            viewerCount: data.count,
            serverTime: data.serverTime ?? s.serverTime,
          }));
        }
      });

      socket.on('event:status_changed', (data: { eventId: string; status: string; serverTime?: string }) => {
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
      });

      socket.on('event:active_lot_changed', (data: {
        eventId: string;
        activeLotId: string | null;
        lotNumber: string | null;
        productTitle: string | null;
        currentPrice: number;
        endTime: string;
        serverTime?: string;
      }) => {
        if (data.eventId === eventId) {
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
          }));
          if (data.activeLotId) {
            Vibration.vibrate(150);
            appendActivity(
              t('auction.newLotActiveTitle', { defaultValue: 'Yeni Lot İhalede!' }),
              t('auction.newLotActiveBody', { 
                defaultValue: 'Lot #{{num}}: {{title}} başladı.', 
                num: data.lotNumber, 
                title: data.productTitle 
              }),
              'accent',
            );
          }
        }
      });

      socket.on('bid:new', (data: {
        auctionId: string;
        currentPrice: number;
        bidCount: number;
        endTime: string;
        serverTime: string;
        amount: number;
        bidderName: string;
      }) => {
        setState((s) => {
          if (s.activeLotId === data.auctionId) {
            return {
              ...s,
              currentPrice: data.currentPrice,
              bidCount: data.bidCount,
              endTime: data.endTime,
              serverTime: data.serverTime,
              lastBid: { amount: data.amount, bidderName: data.bidderName },
            };
          }
          return s;
        });

        appendActivity(
          t('auction.activityBidTitle'),
          t('auction.latestBidMessage', {
            bidder: data.bidderName,
            amount: formatAmount(data.amount),
          }),
          'accent',
        );
      });

      socket.on('bid:outbid', (data: { auctionId: string; newAmount: number; serverTime?: string }) => {
        setState((s) => {
          if (s.activeLotId === data.auctionId) {
            Vibration.vibrate(200);
            showModal({
              title: t('auction.outbidTitle'),
              message: t('auction.outbidMessage', {
                amount: formatAmount(data.newAmount),
              }),
              type: 'info',
            });
            return {
              ...s,
              wasOutbid: true,
              serverTime: data.serverTime ?? s.serverTime,
            };
          }
          return s;
        });
      });

      socket.on('bid:winner', (data: { auctionId: string; finalPrice: number; serverTime?: string }) => {
        setState((s) => {
          if (s.activeLotId === data.auctionId) {
            Vibration.vibrate([0, 200, 100, 200]);
            return {
              ...s,
              isWinner: true,
              lotEnded: true,
              finalPrice: data.finalPrice,
              serverTime: data.serverTime ?? s.serverTime,
            };
          }
          return s;
        });
      });

      socket.on('bid:lost', (data: { auctionId: string; finalPrice: number; serverTime?: string }) => {
        setState((s) => {
          if (s.activeLotId === data.auctionId) {
            return {
              ...s,
              isWinner: false,
              lotEnded: true,
              finalPrice: data.finalPrice,
              serverTime: data.serverTime ?? s.serverTime,
            };
          }
          return s;
        });
      });

      socket.on('auction:extended', (data: { auctionId: string; newEndTime: string; extensionNumber: number; serverTime?: string }) => {
        setState((s) => {
          if (s.activeLotId === data.auctionId) {
            return {
              ...s,
              endTime: data.newEndTime,
              serverTime: data.serverTime ?? s.serverTime,
            };
          }
          return s;
        });
        appendActivity(
          t('auction.extendedTitle'),
          t('auction.extendedMessage', {
            count: data.extensionNumber,
          }),
          'primary',
        );
      });

      socket.on('auction:ended', (data: { auctionId: string; finalPrice: number; bidCount?: number; serverTime?: string }) => {
        setState((s) => {
          if (s.activeLotId === data.auctionId) {
            return {
              ...s,
              lotEnded: true,
              finalPrice: data.finalPrice,
              bidCount: data.bidCount ?? s.bidCount,
              serverTime: data.serverTime ?? s.serverTime,
            };
          }
          return s;
        });
      });

      socket.on('auction:warning', (data: { auctionId: string; serverTime?: string }) => {
        setState((s) => {
          if (s.activeLotId === data.auctionId) {
            Vibration.vibrate(100);
            return {
              ...s,
              serverTime: data.serverTime ?? s.serverTime,
            };
          }
          return s;
        });
        appendActivity(
          t('auction.activityWarningTitle'),
          t('auction.activityWarningBody'),
          'primary',
        );
      });

      socket.on('auction:cancelled', (data: { auctionId: string; reason: string; serverTime?: string }) => {
        setState((s) => {
          if (s.activeLotId === data.auctionId) {
            showModal({
              title: t('auction.cancelledTitle'),
              message: data.reason || t('auction.cancelledMessage'),
              type: 'error',
            });
            return {
              ...s,
              lotEnded: true,
              serverTime: data.serverTime ?? s.serverTime,
            };
          }
          return s;
        });
      });
    };

    connect();

    return () => {
      cancelled = true;
      const socket = socketRef.current;
      if (socket) {
        socket.emit('event:leave', { eventId });
        socket.off('connect');
        socket.off('disconnect');
        socket.off('event:joined');
        socket.off('event:viewer_count');
        socket.off('event:status_changed');
        socket.off('event:active_lot_changed');
        socket.off('bid:new');
        socket.off('bid:outbid');
        socket.off('bid:winner');
        socket.off('bid:lost');
        socket.off('auction:extended');
        socket.off('auction:ended');
        socket.off('auction:warning');
        socket.off('auction:cancelled');
      }
    };
  }, [eventId, showModal, t]);

  const clearOutbid = useCallback(() => {
    setState((s) => ({ ...s, wasOutbid: false }));
  }, []);

  return { ...state, clearOutbid };
}
