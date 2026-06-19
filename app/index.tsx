import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { getAuthBootstrap } from "./_layout";
import { QuadraLogo } from "@/components/icons/QuadraLogo";
import { useAuthStore } from "@/stores/auth";

// Navy → blue brand gradient (surface-dark → primary), per DESIGN_SYSTEM "Gradients".
const PAGE_GRADIENT = ["#0A0A3C", "#1A1AFF"] as const;
// Blue → lime progress fill (primary → accent), matching the lime-tipped bar in splash.png.
const BAR_GRADIENT = ["#1A1AFF", "#AADD00"] as const;

const BAR_TRACK_WIDTH = 160;
const BAR_FILL_WIDTH = BAR_TRACK_WIDTH / 3;
const BAR_TRAVEL = BAR_TRACK_WIDTH - BAR_FILL_WIDTH;

export default function Index() {
  const [ready, setReady] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasProfile = useAuthStore((s) => s.hasProfile);

  // Indeterminate progress: the fill sweeps left→right and back, forever (until redirect).
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * BAR_TRAVEL }],
  }));

  // Await the shared one-shot auth bootstrap (started in the root layout), then redirect.
  useEffect(() => {
    let active = true;
    void getAuthBootstrap().then(() => {
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
            <QuadraLogo size={120} />
            <Text className="font-word text-5xl text-text-on-dark mt-4 lowercase">
              quadra
            </Text>
            <Text className="font-body  text-accent uppercase mt-3 tracking-[1.2px]">
              O JOGO COMEÇA AQUI
            </Text>
          </View>
        </SafeAreaView>

        <View className="absolute bottom-16 inset-x-0 items-center">
          <View
            className="h-1 rounded-pill overflow-hidden bg-white/15"
            style={{ width: BAR_TRACK_WIDTH }}
          >
            <Animated.View
              style={[{ width: BAR_FILL_WIDTH, height: "100%" }, fillStyle]}
            >
              <LinearGradient
                colors={BAR_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1, borderRadius: 9999 }}
              />
            </Animated.View>
          </View>
          <Text
            className="font-mono  text-text-muted uppercase mt-4"
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            accessibilityLabel="Carregando"
          >
            CARREGANDO
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}
