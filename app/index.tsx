import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Line } from "react-native-svg";

import { getAuthBootstrap } from "./_layout";
import { QuadraLogo } from "@/components/icons/QuadraLogo";
import { useRiseIn } from "@/hooks/useRiseIn";
import { useAuthStore } from "@/stores/auth";
import { colors } from "@/theme/colors";

/**
 * The native splash (app.json, `expo-splash-screen`) is the mark alone on blue, at the size
 * Android draws `assets/splash-icon.png`. This screen starts from that same picture, so the
 * hand-off is not seen, and then adds what only JS can draw: the straight court seen from
 * above, the mark's settle and the progress bar (DECISIONS #84, #106). It stays until the auth
 * bootstrap settles, which is capped at 60s (app/_layout.tsx, DECISIONS #44).
 */
const MARK_SIZE = 124;
// Shortest time the splash stays up, so its animation is seen even when the session
// check answers at once. A slower check is not delayed further (DECISIONS #90).
export const MIN_HOLD_MS = 1800;
const EASE = Easing.inOut(Easing.ease);
// Court lines across the screen, as fractions of its height; the center line joins the
// first and the last.
const COURT_LINES = [0.23, 0.32, 0.41, 0.59, 0.68, 0.77];
const COURT_TOP = 0.23;
const COURT_BOTTOM = 0.77;
const COURT_STROKE = { stroke: colors.textOnDark, strokeOpacity: 0.18, strokeWidth: 1.5 };
// Soft navy shadow under the mark (Android only: iOS ignores `filter`).
const MARK_SHADOW = {
  filter: [
    {
      dropShadow: {
        offsetX: 0,
        offsetY: 8,
        standardDeviation: 6,
        color: `${colors.surfaceDark}66`,
      },
    },
  ],
} as const;

export default function Index() {
  const [ready, setReady] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasProfile = useAuthStore((s) => s.hasProfile);
  const { width, height } = useWindowDimensions();

  // Await the shared one-shot auth bootstrap (started in the root layout) and the minimum
  // hold, whichever ends last, then redirect.
  useEffect(() => {
    let active = true;
    const hold = new Promise<void>((resolve) => setTimeout(resolve, MIN_HOLD_MS));
    void Promise.all([getAuthBootstrap(), hold]).then(() => {
      if (active) {
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!isAuthenticated) {
      router.replace("/(auth)/login");
    } else if (!hasProfile) {
      router.replace("/(auth)/onboarding");
    } else {
      router.replace("/(tabs)");
    }
  }, [ready, isAuthenticated, hasProfile]);

  // The tail of the prototype's `qSplashMark`: the native splash already shows the mark at
  // rest, so it only overshoots and settles instead of popping in from nothing.
  const settle = useSharedValue(0);
  // The bar fills to 90% over the minimum hold and waits there for a slower bootstrap.
  const progress = useSharedValue(0);
  useEffect(() => {
    settle.value = withSequence(
      withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) }),
      withTiming(0, { duration: 280, easing: EASE }),
    );
    progress.value = withTiming(0.9, { duration: MIN_HOLD_MS, easing: EASE });
  }, [settle, progress]);
  const markStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + 0.08 * settle.value },
      { rotate: `${3 * settle.value}deg` },
    ],
  }));
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const courtStyle = useRiseIn({ distance: 0, duration: 400 });
  const loaderStyle = useRiseIn({ delay: 250, distance: 14, duration: 500 });

  const top = height * COURT_TOP;
  const bottom = height * COURT_BOTTOM;

  return (
    <View
      className="flex-1 items-center justify-center bg-primary"
      accessible
      accessibilityLabel="Carregando"
    >
      {/* Straight court seen from above, with the center circle around the mark. */}
      <Animated.View className="absolute inset-0" style={courtStyle}>
        <Svg width={width} height={height}>
          {COURT_LINES.map((y) => (
            <Line key={y} x1={0} y1={height * y} x2={width} y2={height * y} {...COURT_STROKE} />
          ))}
          <Line x1={width / 2} y1={top} x2={width / 2} y2={bottom} {...COURT_STROKE} />
          <Circle
            cx={width / 2}
            cy={height / 2}
            r={width * 0.215}
            fill="none"
            {...COURT_STROKE}
          />
        </Svg>
      </Animated.View>

      <Animated.View style={markStyle}>
        <View style={MARK_SHADOW}>
          <QuadraLogo
            size={MARK_SIZE}
            blockColor={colors.textOnDark}
            testID="splash-mark"
          />
        </View>
      </Animated.View>

      <Animated.View
        className="absolute h-[5px] w-[38%] overflow-hidden rounded-full bg-white/25"
        style={[{ bottom: height * 0.1 }, loaderStyle]}
        testID="splash-progress"
      >
        <Animated.View className="h-full rounded-full bg-accent" style={fillStyle} />
      </Animated.View>
    </View>
  );
}
