import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, FontFamily } from '../../constants/theme';

interface CountdownTimerProps {
  endTime: string;
  serverTime?: string;
  onExpired?: () => void;
}

export function CountdownTimer({
  endTime,
  serverTime,
  onExpired,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isUrgent, setIsUrgent] = useState(false);

  // Pulse animation for urgent state
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (isUrgent) {
      pulse.value = withRepeat(
        withTiming(0.6, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      pulse.value = 1;
    }
  }, [isUrgent]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  useEffect(() => {
    if (!endTime) return;

    // D-06: Server timestamp sync
    const serverOffset = serverTime
      ? new Date(serverTime).getTime() - Date.now()
      : 0;

    const timer = setInterval(() => {
      const now = Date.now() + serverOffset;
      const end = new Date(endTime).getTime();
      const diff = Math.max(0, end - now);

      if (diff === 0) {
        clearInterval(timer);
        onExpired?.();
      }

      const totalSeconds = Math.floor(diff / 1000);
      setTimeLeft({
        hours: Math.floor(totalSeconds / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
      setIsUrgent(totalSeconds <= 60);
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, serverTime]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const display =
    timeLeft.hours > 0
      ? `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`
      : `${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;

  return (
    <Animated.View
      style={[styles.container, isUrgent && styles.urgent, pulseStyle]}
    >
      <Text style={[styles.label, isUrgent && styles.urgentText]}>
        {isUrgent ? '⚡ Son saniyeler!' : 'Kalan Süre'}
      </Text>
      <Text style={[styles.time, isUrgent && styles.urgentText]}>
        {display}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
  },
  urgent: {
    backgroundColor: '#e63946',
  },
  label: {
    fontSize: 12,
    fontFamily: FontFamily?.medium || undefined,
    color: '#888',
    marginBottom: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  time: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: FontFamily?.bold || undefined,
    color: '#fff',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  urgentText: {
    color: '#fff',
  },
});
