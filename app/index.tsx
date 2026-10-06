import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { getAuthBootstrap } from "./_layout";
import { QuadraLogo } from "@/components/icons/QuadraLogo";
import { useRiseIn } from "@/hooks/useRiseIn";
import { useAuthStore } from "@/stores/auth";

// Navy → blue brand gradient (surface-dark → primary), per DESIGN_SYSTEM "Gradients".
const PAGE_GRADIENT = ["#0A0A3C", "#1A1AFF"] as const;
// Blue → lime progress fill (primary → accent), matching the lime-tipped bar in splash.png.
const BAR_GRADIENT = ["#1A1AFF", "#AADD00"] as const;

const BAR_TRACK_WIDTH = 160;

/**
 * The splash is held this long even when the auth bootstrap resolves instantly,
 * so the brand animation and the bar fill are actually seen. The splash then
 * stays until the bootstrap settles, which is capped at 60s (app/_layout.tsx,
 * DECISIONS #44) for when the hosted API is waking up.
 */
const MIN_SPLASH_MS = 1800;

// Entrance timeline (ms), mirroring the prototype's .q-splash-* CSS animations.
const MARK_DURATION = 700;
const RISE_DURATION = 500;
const RISE_DISTANCE = 14;
const WORD_DELAY = 350;
const TAG_DELAY = 520;
const LOAD_DELAY = 700;
const BAR_DELAY = 350;
const BAR_DURATION = 1400;
const PULSE_HALF_CYCLE = 700;

// Back-out overshoot (CSS cubic-bezier(.34,1.56,.64,1)): the mark pops past its
// final size and rotation, then settles.
const POP_EASING = Easing.bezier(0.34, 1.56, 0.64, 1);
// Fast start, slow settle (CSS cubic-bezier(.5,0,.2,1)) for the progress fill.
const BAR_EASING = Easing.bezier(0.5, 0, 0.2, 1);

/** The splash's `qSplashUp` entrance — softer and slower than the default `.q-rise`. */
const SPLASH_RISE = {
  distance: RISE_DISTANCE,
  duration: RISE_DURATION,
  easing: Easing.out(Easing.ease),
} as const;

export default function Index() {
  const [ready, setReady] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasProfile = useAuthStore((s) => s.hasProfile);

  const wordStyle = useRiseIn({ ...SPLASH_RISE, delay: WORD_DELAY });
  const tagStyle = useRiseIn({ ...SPLASH_RISE, delay: TAG_DELAY });
  const loadStyle = useRiseIn({ ...SPLASH_RISE, delay: LOAD_DELAY });

  const mark = useSharedValue(0);
  const bar = useSharedValue(0);
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    mark.value = withTiming(1, { duration: MARK_DURATION, easing: POP_EASING });
    bar.value = withDelay(
      BAR_DELAY,
      withTiming(1, { duration: BAR_DURATION, easing: BAR_EASING }),
    );
    // "CARREGANDO" breathes between 50% and 100% opacity until the redirect.
    pulse.value = withRepeat(
      withTiming(1, {
        duration: PULSE_HALF_CYCLE,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [mark, bar, pulse]);

  const markStyle = useAnimatedStyle(() => ({
    // Fade finishes early in the pop, as in the prototype's 0/60/100 keyframes.
    opacity: Math.min(mark.value / 0.4, 1),
    transform: [
      { scale: 0.55 + mark.value * 0.45 },
      { rotate: `${-12 + mark.value * 12}deg` },
    ],
  }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  // scaleX from the left edge grows the fill the way the prototype animates
  // `width: 0% -> 100%`, but stays on the UI thread instead of relaying out.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: bar.value }],
  }));

  // Await the shared one-shot auth bootstrap (started in the root layout) and the
  // minimum hold, then redirect.
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const minimumHold = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, MIN_SPLASH_MS);
    });
    void Promise.all([getAuthBootstrap(), minimumHold]).then(() => {
      if (active) {
        setReady(true);
      }
    });
    return () => {
      active = false;
      clearTimeout(timer);
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

  return (
    <View className="flex-1 bg-surface-dark">
      <LinearGradient
        colors={PAGE_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
        accessible={false}
        importantForAccessibility="no"
      >
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <View className="items-center">
            <Animated.View style={markStyle}>
              <QuadraLogo size={120} />
            </Animated.View>
            <Animated.Text
              className="font-word text-5xl text-text-on-dark mt-4 lowercase"
              style={wordStyle}
            >
              quadra
            </Animated.Text>
            <Animated.Text
              className="font-body  text-accent uppercase mt-3 tracking-[1.2px]"
              style={tagStyle}
            >
              O JOGO COMEÇA AQUI
            </Animated.Text>
          </View>
        </SafeAreaView>

        <Animated.View
          className="absolute bottom-16 inset-x-0 items-center"
          style={loadStyle}
        >
          <View
            className="h-1 rounded-pill overflow-hidden bg-white/15"
            style={{ width: BAR_TRACK_WIDTH }}
          >
            <Animated.View
              style={[
                { width: "100%", height: "100%", transformOrigin: "left" },
                fillStyle,
              ]}
            >
              <LinearGradient
                colors={BAR_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1, borderRadius: 9999 }}
              />
            </Animated.View>
          </View>
          <Animated.Text
            className="font-mono  text-text-muted uppercase mt-4"
            style={pulseStyle}
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            accessibilityLabel="Carregando"
          >
            CARREGANDO
          </Animated.Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}
