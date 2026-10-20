import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

import { colors } from '@/theme/colors';

type SkeletonBlockProps = {
  /** Size (and any radius override) of the placeholder, e.g. `"h-44 w-64"`. */
  className?: string;
  /** `"dark"` when the placeholder sits on a navy surface. */
  tone?: 'light' | 'dark';
  testID?: string;
};

/**
 * Loading placeholder: a neutral rounded block, sized by the caller to the
 * content it stands in for, with a slow opacity pulse so a pending screen reads
 * as "loading" rather than as empty grey boxes.
 */
export function SkeletonBlock({ className = '', tone = 'light', testID }: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  // Size and radius come from the className on the plain View; the fill pulses
  // on an inner Animated.View so NativeWind never has to style an animated node.
  return (
    <View testID={testID} className={`rounded-card overflow-hidden ${className}`}>
      <Animated.View
        style={{
          flex: 1,
          opacity,
          backgroundColor: tone === 'dark' ? colors.surfaceDarkAlt : colors.bgLightAlt,
        }}
      />
    </View>
  );
}
