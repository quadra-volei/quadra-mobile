import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { getAuthBootstrap } from "./_layout";
import { QuadraLogo } from "@/components/icons/QuadraLogo";
import { useAuthStore } from "@/stores/auth";
import { colors } from "@/theme/colors";

/**
 * Same picture as the native splash (app.json, `expo-splash-screen`): the mark alone,
 * centered on lime, at the size Android draws `assets/splash-icon.png`. The hand-off from
 * the native splash to this screen is therefore invisible. It stays until the auth
 * bootstrap settles, which is capped at 60s (app/_layout.tsx, DECISIONS #44).
 */
const MARK_SIZE = 124;

export default function Index() {
  const [ready, setReady] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasProfile = useAuthStore((s) => s.hasProfile);

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
    <View
      className="flex-1 items-center justify-center bg-accent"
      accessible
      accessibilityLabel="Carregando"
    >
      <QuadraLogo size={MARK_SIZE} accentColor={colors.textOnDark} />
    </View>
  );
}
