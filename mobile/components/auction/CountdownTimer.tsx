import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { countdownStyles as styles } from './CountdownTimer.styles';

interface CountdownTimerProps {
  endTime: string;
  serverTime?: string;
  onExpired?: () => void;
  label?: string;
}

export function CountdownTimer({
  endTime,
  serverTime,
  onExpired,
  label,
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
  }, [isUrgent, pulse]);

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
  }, [endTime, onExpired, serverTime]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const display =
    timeLeft.hours > 0
      ? `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`
      : `${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;

  return (
    <Animated.View
      style={[styles.container, isUrgent && !label && styles.urgent, pulseStyle]}
    >
      <Text style={[styles.label, isUrgent && !label && styles.urgentText]}>
        {isUrgent && !label ? '⚡ Son saniyeler!' : (label || 'Kalan Süre')}
      </Text>
      <Text style={[styles.time, isUrgent && !label && styles.urgentText]}>
        {display}
      </Text>
    </Animated.View>
  );
}
