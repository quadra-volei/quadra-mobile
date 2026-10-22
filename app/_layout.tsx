import '../global.css';
// Registers `className` support on third-party components (expo-image). Must run
// before any screen renders an <Avatar>/cover image. Side-effect import only.
import '@/lib/registerCssInterop';

import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';
import {
  DMMono_400Regular,
  DMMono_500Medium,
} from '@expo-google-fonts/dm-mono';
import { RussoOne_400Regular } from '@expo-google-fonts/russo-one';
import * as Sentry from '@sentry/react-native';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UpdateGate } from '@/components/domain/UpdateGate';
import { DialogHost } from '@/components/ui/Dialog';
import { prefetchProfileTab } from '@/features/profile/api/prefetchProfileTab';
import { getAccessToken } from '@/lib/auth/getAccessToken';
import { verifySession } from '@/lib/auth/verifySession';
import { useAuthStore } from '@/stores/auth';
import { STACK_OPTIONS } from '@/theme/motion';

// Crashes, JS errors and a sample of traces to Sentry (project quadra-mobile). Without
// EXPO_PUBLIC_SENTRY_DSN (local runs) nothing is sent. No PII: user IP and request bodies stay out.
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
});

SplashScreen.preventAutoHideAsync();

// The hosted test API sleeps when idle and takes up to a minute to answer the
// first request; a shorter cap sent a valid session to Login while it woke up.
const AUTH_BOOTSTRAP_TIMEOUT_MS = 60_000;

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('auth-bootstrap-timeout')), ms);
  });
}

/**
 * Runs the one-shot auth bootstrap: read the stored token, validate it against
 * the backend, and resolve the auth store. Any failure (no token, invalid token,
 * network error, or a stall past the cap) falls through to the unauthenticated state so
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
      // verifySession hands back a new token when the stored one had expired.
      accessToken: session.accessToken ?? accessToken,
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

// React Native has no window focus: the app coming back to the foreground is
// the "focus", so stale data is re-read on return and polling (the match
// screen) stops while the app is in the background.
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
  return () => subscription.remove();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

export default Sentry.wrap(RootLayout);

function RootLayout() {
  const [fontsLoaded] = useFonts({
    'ClimateCrisis-Regular': require('../assets/fonts/ClimateCrisis-Regular-VariableFont_YEAR.ttf'),
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    DMMono_400Regular,
    DMMono_500Medium,
    RussoOne_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      // Kick off the one-shot auth bootstrap; the splash route awaits the
      // shared promise to drive its redirect.
      void getAuthBootstrap();
    }
  }, [fontsLoaded]);

  // Signed in with a finished profile (app open or right after login): load the
  // profile tab's data now, so opening the tab does not start from empty.
  const signedIn = useAuthStore((s) => s.isAuthenticated && s.hasProfile);
  useEffect(() => {
    if (signedIn) {
      prefetchProfileTab(queryClient);
    }
  }, [signedIn]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppStatusBar />
          <Stack screenOptions={STACK_OPTIONS}>
            {/* Splash → login / tabs swaps the whole app: a fade, not a push. */}
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          </Stack>
          <UpdateGate />
          <DialogHost />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Screens drawn on navy or blue (splash, sign-in, the live game, the card):
// light status-bar icons there, dark everywhere else. Never "auto": it follows
// the phone's dark mode, and the app is light-only, so the icons vanished on
// the light screens (owner's 4th review, item 9; DECISIONS #172).
const DARK_ROUTES = [
  /^\/$/,
  /^\/(login|sms-otp|onboarding)$/,
  /\/(scoreboard|mvp-vote|summary)$/,
  /^\/profile\/card$/,
  /^\/players\/[^/]+\/card$/,
  /^\/p\//,
];

function AppStatusBar() {
  const pathname = usePathname();
  return <StatusBar style={DARK_ROUTES.some((route) => route.test(pathname)) ? 'light' : 'dark'} />;
}


