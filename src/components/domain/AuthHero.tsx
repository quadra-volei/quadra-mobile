import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuadraWordmark } from '@/components/icons/QuadraWordmark';
import { useRiseIn } from '@/hooks/useRiseIn';
import { HERO_GRADIENT } from '@/theme/colors';

// Intro entrance stagger (ms), mirroring the prototype's .q-rise animationDelays.
const LOCKUP_DELAY = 0;
const HEADLINE_DELAY = 60;
const SUBTITLE_DELAY = 120;

// The lockup, 20% under the 64 it was (the CTA keeps its size and touch area).
const LOCKUP_HEIGHT = 51;

/**
 * The "O JOGO COMEÇA AQUI." background of the sign-in flow: navy-to-blue
 * gradient, the lockup, the headline and the subtitle. The login shows it with
 * the lockup and rises it in; the SMS code screen shows the same background
 * still and without the lockup, so going from one to the other only swaps the
 * white card (DECISIONS #165). `children` sit pinned at the bottom (the
 * login's CTA).
 */
export function AuthHero({
  lockup = true,
  animate = true,
  children,
}: {
  lockup?: boolean;
  animate?: boolean;
  children?: ReactNode;
}) {
  const duration = animate ? 450 : 0;
  const lockupStyle = useRiseIn({ delay: LOCKUP_DELAY, duration });
  const headlineStyle = useRiseIn({ delay: animate ? HEADLINE_DELAY : 0, duration });
  const subtitleStyle = useRiseIn({ delay: animate ? SUBTITLE_DELAY : 0, duration });

  return (
    <LinearGradient colors={HERO_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 px-6">
        <View className="flex-1 justify-center">
          {lockup ? (
            <Animated.View style={lockupStyle}>
              <QuadraWordmark variant="blue" height={LOCKUP_HEIGHT} testID="login-wordmark" />
            </Animated.View>
          ) : (
            // Same height as the lockup, so the headline does not move.
            <View style={{ height: LOCKUP_HEIGHT }} />
          )}

          {/* Intro set 1.5× the screen defaults (Johny, 2026-10-21), then the whole
              set 20% smaller (owner's 4th review, item 12; DECISIONS #172). */}
          <Animated.Text
            className="font-display text-[43px] text-text-on-dark uppercase mt-[38px] leading-[46px]"
            style={headlineStyle}
          >
            O JOGO{'\n'}COMEÇA{'\n'}
            <Text className="text-accent">AQUI.</Text>
          </Animated.Text>

          <Animated.Text
            className="font-body-semibold text-[18px] leading-[26px] text-text-on-dark mt-[19px]"
            style={subtitleStyle}
          >
            Encontre partidas de vôlei perto de você, monte seu time e suba no ranking.
          </Animated.Text>
        </View>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}
