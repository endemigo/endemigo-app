import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles, launchSplashMetrics } from './LaunchSplash.styles';
import type { LaunchSplashImageItem } from '../../utils/launchSplashImages';
import { buildLaunchSplashColumns } from '../../utils/launchSplashImages';

interface LaunchSplashProps {
  images: LaunchSplashImageItem[];
}

const ANIMATION_DURATIONS = [2200, 2600, 2400, 2850] as const;
const COLUMN_OFFSET_STYLES = [
  undefined,
  styles.columnTrackOffsetSm,
  styles.columnTrackOffsetLg,
  styles.columnTrackOffsetSm,
] as const;

export function LaunchSplash({ images }: LaunchSplashProps) {
  const { t } = useTranslation();
  const animatedValues = useRef(
    Array.from({ length: launchSplashMetrics.columnCount }, () => new Animated.Value(0)),
  ).current;

  const columns = useMemo(
    () => buildLaunchSplashColumns(images, launchSplashMetrics.columnCount),
    [images],
  );

  useEffect(() => {
    const animations = columns.map((column, index) => {
      const animatedValue = animatedValues[index];
      const loopDistance = Math.max(
        launchSplashMetrics.imageHeight + launchSplashMetrics.columnGap,
        column.length * (launchSplashMetrics.imageHeight + launchSplashMetrics.columnGap),
      );

      animatedValue.setValue(0);

      return Animated.loop(
        Animated.timing(animatedValue, {
          toValue: -loopDistance,
          duration: ANIMATION_DURATIONS[index % ANIMATION_DURATIONS.length],
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
    });

    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
      animatedValues.forEach((value) => value.stopAnimation());
    };
  }, [animatedValues, columns]);

  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.backgroundLayer}>
        {columns.map((column, index) => {
          const repeatedColumn = [...column, ...column, ...column];

          return (
            <View key={`launch-splash-column-${index}`} style={styles.columnViewport}>
              <Animated.View
                style={[
                  styles.columnTrack,
                  COLUMN_OFFSET_STYLES[index % COLUMN_OFFSET_STYLES.length],
                  { transform: [{ translateY: animatedValues[index] }] },
                ]}
              >
                {repeatedColumn.map((item, itemIndex) => (
                  <View key={`${item.id}-${itemIndex}`} style={styles.imageCard}>
                    <Image source={{ uri: item.uri }} style={styles.image} resizeMode="cover" blurRadius={1} />
                  </View>
                ))}
              </Animated.View>
            </View>
          );
        })}
      </View>

      <View style={styles.dimmer} />

      <View style={styles.overlay}>
        <View style={styles.contentCard}>
          <Image
            source={require('../../assets/images/endemigo-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Animated.Text style={styles.tagline}>{t('launchSplash.tagline')}</Animated.Text>
        </View>
      </View>
    </View>
  );
}
