import { useEffect } from "react";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type WithTimingConfig,
} from "react-native-reanimated";

/** The prototype's `.q-rise` curve (CSS cubic-bezier(.2,.7,.2,1)). */
export const RISE_EASING = Easing.bezier(0.2, 0.7, 0.2, 1);

export type RiseInOptions = {
  /** ms to wait before rising. Stagger siblings by giving each a larger delay. */
  delay?: number;
  /** px below its final position that the element starts from. */
  distance?: number;
  duration?: number;
  easing?: WithTimingConfig["easing"];
};

/**
 * "Fade up into place" entrance — the element starts `distance` px low and
 * transparent, then settles into its laid-out position. Ports the prototype's
 * `.q-rise` / `qSplashUp` animations (see Quadra.html).
 *
 * Returns a style for an `<Animated.View>` / `<Animated.Text>`. The defaults are
 * `.q-rise`; the splash passes its own (softer, slower) values.
 */
export function useRiseIn({
  delay = 0,
  distance = 16,
  duration = 450,
  easing = RISE_EASING,
}: RiseInOptions = {}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration, easing }));
  }, [progress, delay, duration, easing]);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * distance }],
  }));
}
