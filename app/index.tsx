import { useAuthStore } from '@/stores/auth';
import { getAccessToken } from '@/lib/auth/getAccessToken';
import { verifySession } from '@/lib/auth/verifySession';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { QuadraLogo } from '@/components/icons/QuadraLogo';

export default function SplashScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const hasNavigated = useRef(false);

  // Step 1: Read token from secure store (undefined = not yet loaded, null = no token)
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    getAccessToken().then(setToken);
  }, []);

  // Step 2: TanStack Query — enabled only once token is known and non-null
  const { data: session, isError, isSuccess } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => verifySession(token!),
    enabled: token !== undefined && token !== null,
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });

  // Step 3: Routing side-effect
  useEffect(() => {
    if (token === undefined) return; // still reading secure store

    if (token === null) {
      if (hasNavigated.current) return;
      hasNavigated.current = true;
      router.replace('/(auth)/login');
      return;
    }

    if (!isSuccess && !isError) return; // query still in-flight

    if (hasNavigated.current) return;
    hasNavigated.current = true;

    if (isError || !session) {
      if (__DEV__) {
        console.error('[SplashScreen] Auth check failed — routing to login');
      }
      router.replace('/(auth)/login');
      return;
    }

    setAuth({ userId: session.userId, accessToken: token, hasProfile: session.hasProfile });
    router.replace(session.hasProfile ? '/(tabs)' : '/(auth)/onboarding');
  }, [token, isSuccess, isError, session, router, setAuth]);

  // 2-second timeout guard: if routing has not occurred, fall back to login
  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasNavigated.current) return;
      hasNavigated.current = true;
      if (__DEV__) {
        console.error('[SplashScreen] Auth check timed out — routing to login');
      }
      router.replace('/(auth)/login');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  // Indeterminate progress bar animation
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View testID="splash-root" className="flex-1 bg-surface-dark">
      <StatusBar style="light" />

      {/* Centered brand lockup */}
      <View className="flex-1 items-center justify-center px-8">
        <QuadraLogo testID="quadra-logo" size={72} />

        <Text className="font-word text-display text-on-dark mt-4 leading-none">
          quadra
        </Text>

        <Text className="font-display text-h1 text-accent uppercase mt-2 tracking-widest">
          O JOGO COMEÇA AQUI
        </Text>
      </View>

      {/* Loading bar at bottom */}
      <View className="pb-12 px-16 items-center gap-3">
        {/* h-px = 1px hairline — justified exception: progress bar tracks are a standard 1px UI pattern */}
        <View
          testID="progress-bar-track"
          className="w-full h-px bg-surface-dark-alt rounded-full overflow-hidden"
        >
          <Animated.View testID="progress-bar-fill" className="h-full bg-accent rounded-full" style={progressStyle} />
        </View>
        <Text className="font-mono text-mono text-on-dark opacity-50 uppercase tracking-widest">
          CARREGANDO
        </Text>
      </View>
    </View>
  );
}
