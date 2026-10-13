import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { G, Line, Rect } from "react-native-svg";

import { getAuthBootstrap } from "./_layout";
import { QuadraLogo } from "@/components/icons/QuadraLogo";
import { useRiseIn } from "@/hooks/useRiseIn";
import { useAuthStore } from "@/stores/auth";
import { colors } from "@/theme/colors";

/**
 * The native splash (app.json, `expo-splash-screen`) is the mark alone on blue, at the size
 * Android draws `assets/splash-icon.png`. This screen starts from that same picture, so the
 * hand-off is not seen, and then adds what only JS can draw: the court lines, the mark's
 * settle and the loader (DECISIONS #84). It stays until the auth bootstrap settles, which is
 * capped at 60s (app/_layout.tsx, DECISIONS #44).
 */
const MARK_SIZE = 124;
// Shortest time the splash stays up, so its animation is seen even when the session
// check answers at once. A slower check is not delayed further (DECISIONS #90).
export const MIN_HOLD_MS = 1800;
const LOADER_SEGMENTS = [0, 1, 2, 3, 4, 5, 6];
const EASE = Easing.inOut(Easing.ease);

/** One lit segment of the loader; each starts 110 ms after the one before it. */
function LoaderSegment({ index }: { index: number }) {
  const lit = useSharedValue(0);

  useEffect(() => {
    lit.value = withDelay(
      index * 110,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: EASE }),
          withTiming(0, { duration: 480, easing: EASE }),
        ),
        -1,
      ),
    );
  }, [lit, index]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.75 * lit.value,
    transform: [{ scaleY: 0.55 + 0.45 * lit.value }],
  }));

  return (
    <Animated.View className="h-[11px] w-[7px] rounded-sm bg-accent" style={style} />
  );
}

export default function Index() {
  const [ready, setReady] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasProfile = useAuthStore((s) => s.hasProfile);

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
  useEffect(() => {
    settle.value = withSequence(
      withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) }),
      withTiming(0, { duration: 280, easing: EASE }),
    );
  }, [settle]);
  const markStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + 0.08 * settle.value },
      { rotate: `${3 * settle.value}deg` },
    ],
  }));

  const courtStyle = useRiseIn({ distance: 0, duration: 400 });
  const loaderStyle = useRiseIn({ delay: 250, distance: 14, duration: 500 });

  return (
    <View
      className="flex-1 items-center justify-center bg-primary"
      accessible
      accessibilityLabel="Carregando"
    >
      {/* Tilted court, net line and dashed rally path, stretched to the screen. */}
      <Animated.View className="absolute inset-0" style={courtStyle}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 390 844"
          preserveAspectRatio="none"
        >
          <G rotation={-13} origin="195, 422" stroke={colors.accent}>
            <Rect
              x={54}
              y={230}
              width={282}
              height={430}
              rx={3}
              fill={colors.surfaceDark}
              fillOpacity={0.2}
              strokeWidth={1.5}
              strokeOpacity={0.72}
            />
            <Line x1={54} y1={374} x2={336} y2={374} strokeWidth={1.5} strokeOpacity={0.7} />
            <Line x1={54} y1={516} x2={336} y2={516} strokeWidth={1.5} strokeOpacity={0.7} />
            <Line x1={44} y1={374} x2={346} y2={374} strokeWidth={1} strokeOpacity={0.48} />
          </G>
          <Line
            x1={38}
            y1={545}
            x2={352}
            y2={478}
            stroke={colors.textOnDark}
            strokeWidth={2}
            strokeDasharray="3 9"
            strokeLinecap="round"
            strokeOpacity={0.5}
          />
          <Rect x={18} y={446} width={9} height={9} rx={1} fill={colors.accent} />
        </Svg>
      </Animated.View>

      <Animated.View style={markStyle}>
        <QuadraLogo
          size={MARK_SIZE}
          blockColor={colors.textOnDark}
          testID="splash-mark"
        />
      </Animated.View>

      <Animated.View className="absolute bottom-24" style={loaderStyle}>
        <View
          className="h-5 w-28 flex-row items-center justify-between rounded-md border border-white/40 px-2"
          style={{ transform: [{ skewX: "-16deg" }] }}
        >
          {LOADER_SEGMENTS.map((index) => (
            <LoaderSegment key={index} index={index} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}
