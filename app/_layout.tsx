import '../global.css';

import {
  DMSans_400Regular,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';
import {
  DMMono_400Regular,
  DMMono_500Medium,
} from '@expo-google-fonts/dm-mono';
import { RussoOne_400Regular } from '@expo-google-fonts/russo-one';
import { Baloo2_600SemiBold } from '@expo-google-fonts/baloo-2';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getAccessToken } from '@/lib/auth/getAccessToken';
import { verifySession } from '@/lib/auth/verifySession';
import { useAuthStore } from '@/stores/auth';

SplashScreen.preventAutoHideAsync();

const AUTH_BOOTSTRAP_TIMEOUT_MS = 2000;

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('auth-bootstrap-timeout')), ms);
  });
}

/**
 * Runs the one-shot auth bootstrap: read the stored token, validate it against
 * the backend, and resolve the auth store. Any failure (no token, invalid token,
 * network error, or a >2s stall) falls through to the unauthenticated state so
 * the splash can redirect to Login. Reports `ready` once the flow settles.
 */
async function runAuthBootstrap(): Promise<void> {
  const { setAuth, clearAuth } = useAuthStore.getState();
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      clearAuth();
      return;
    }
    const session = await Promise.race([
      verifySession(accessToken),
      timeout(AUTH_BOOTSTRAP_TIMEOUT_MS),
    ]);
    setAuth({
      userId: session.userId,
      accessToken,
      hasProfile: session.hasProfile,
    });
  } catch {
    clearAuth();
  }
}

let bootstrapPromise: Promise<void> | null = null;

/**
 * Returns the single shared auth-bootstrap promise, starting it on first call.
 * The root layout triggers it once fonts are ready; the splash route (`index.tsx`)
 * awaits the same promise to know when to redirect — the check never runs twice.
 */
export function getAuthBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = runAuthBootstrap();
  }
  return bootstrapPromise;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'ClimateCrisis-Regular': require('../assets/fonts/ClimateCrisis-Regular-VariableFont_YEAR.ttf'),
    DMSans_400Regular,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    DMMono_400Regular,
    DMMono_500Medium,
    RussoOne_400Regular,
    Baloo2_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      // Kick off the one-shot auth bootstrap; the splash route awaits the
      // shared promise to drive its redirect.
      void getAuthBootstrap();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
