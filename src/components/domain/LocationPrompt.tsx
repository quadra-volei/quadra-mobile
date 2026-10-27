import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';
import { type RefObject, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/PressableScale';
import { HARD_SHADOW, colors } from '@/theme/colors';
import { MOTION } from '@/theme/motion';

type PromptState = 'checking' | 'ask' | 'denied' | 'done';

export type LocationPromptProps = {
  /** Called once the user allows: the tabs remount so they read the position. */
  onGranted: () => void;
  /** What the backdrop blurs on Android (a `BlurTargetView` behind the prompt). */
  blurTarget?: RefObject<View | null>;
};

// Same wide options as the create sheet (DECISIONS #98).
const OPTION =
  'h-14 flex-row items-center justify-center rounded-btn border-2 border-surface-dark px-4';

/**
 * Asks for the location permission once, when the signed-in app opens: a card
 * in the middle of the screen over the tabs, blurred and dimmed behind it, in
 * the create sheet's language (DECISIONS #72, #188). Shown only while the
 * permission was never answered; a user who denies is told what stops working
 * and goes on into the app. The veil does not close it: one of the buttons has
 * to answer. Rendered as an overlay (not a `Modal`) so the Android blur can read
 * the tabs behind it.
 */
export function LocationPrompt({ onGranted, blurTarget }: LocationPromptProps) {
  const [state, setState] = useState<PromptState>('checking');
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let active = true;
    Location.getForegroundPermissionsAsync()
      .then(({ status }) => {
        if (!active) return;
        setState(
          status === Location.PermissionStatus.UNDETERMINED ? 'ask' : 'done',
        );
      })
      // No answer from the system: never hold the app behind the prompt.
      .catch(() => active && setState('done'));
    return () => {
      active = false;
    };
  }, []);

  async function handleAllow() {
    setAsking(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === Location.PermissionStatus.GRANTED) {
        setState('done');
        onGranted();
      } else {
        setState('denied');
      }
    } catch {
      setState('done');
    }
  }

  if (state === 'checking' || state === 'done') return null;

  return (
    <Animated.View
      testID="location-prompt"
      style={StyleSheet.absoluteFill}
      entering={FadeIn.duration(MOTION.fadeIn)}
      exiting={FadeOut.duration(MOTION.fadeIn)}
    >
      <BlurView
        intensity={30}
        tint="dark"
        blurMethod="dimezisBlurViewSdk31Plus"
        blurTarget={blurTarget}
        style={StyleSheet.absoluteFill}
      />
      {/* Navy veil over the blur, as in the create sheet; it takes the taps so
          the tabs behind cannot be used before an answer. */}
      <Pressable
        accessible={false}
        className="bg-surface-dark/30"
        style={StyleSheet.absoluteFill}
      />

      <View
        pointerEvents="box-none"
        className="flex-1 items-center justify-center px-6"
      >
        <Animated.View
          entering={ZoomIn.duration(220)}
          className="w-full rounded-card border-2 border-surface-dark bg-white px-6 pt-6 pb-5"
          style={HARD_SHADOW}
        >
          <View
            className="h-14 w-14 items-center justify-center self-center rounded-full border-2 border-surface-dark bg-accent"
          >
            <MapPin size={26} color={colors.surfaceDark} strokeWidth={2.4} />
          </View>

          {state === 'ask' ? (
            <>
              <Text className="mt-4 font-display text-h3 text-surface-dark uppercase text-center">
                Jogos perto de você
              </Text>
              <Text className="mt-2 font-body text-body text-text-muted text-center">
                O Quadra usa a sua localização para mostrar as partidas por
                perto e a distância até cada quadra.
              </Text>
              <PressableScale
                onPress={handleAllow}
                disabled={asking}
                accessibilityRole="button"
                accessibilityLabel="Permitir localização"
                className={`${OPTION} mt-5 bg-accent`}
                style={HARD_SHADOW}
                testID="location-prompt-allow"
              >
                <Text className="font-body-bold text-body-bold text-surface-dark">
                  Permitir localização
                </Text>
              </PressableScale>
            </>
          ) : (
            <>
              <Text className="mt-4 font-display text-h3 text-surface-dark uppercase text-center">
                Sem localização
              </Text>
              <Text className="mt-2 font-body text-body text-text-muted text-center">
                Você pode usar o app assim mesmo, mas as partidas por perto e
                as distâncias não vão partir de onde você está. Dá para ativar
                depois nas configurações do celular.
              </Text>
              <PressableScale
                onPress={() => setState('done')}
                accessibilityRole="button"
                accessibilityLabel="Continuar sem localização"
                className={`${OPTION} mt-5 bg-accent`}
                style={HARD_SHADOW}
                testID="location-prompt-continue"
              >
                <Text className="font-body-bold text-body-bold text-surface-dark">
                  Continuar sem localização
                </Text>
              </PressableScale>
              <PressableScale
                onPress={() => Linking.openSettings()}
                accessibilityRole="button"
                accessibilityLabel="Abrir configurações"
                className={`${OPTION} mt-3 bg-white`}
                style={HARD_SHADOW}
              >
                <Text className="font-body-bold text-body-bold text-surface-dark">
                  Abrir configurações
                </Text>
              </PressableScale>
            </>
          )}
        </Animated.View>
      </View>
    </Animated.View>
  );
}
