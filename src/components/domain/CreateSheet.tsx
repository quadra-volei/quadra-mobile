import { BlurView } from 'expo-blur';
import type { RefObject } from 'react';
import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/PressableScale';
import { HARD_SHADOW } from '@/theme/colors';
import { MOTION } from '@/theme/motion';

export type CreateSheetProps = {
  onClose: () => void;
  onCreateMatch: () => void;
  onCreatePost: () => void;
  /** What the backdrop blurs on Android (a `BlurTargetView` behind the sheet). */
  blurTarget?: RefObject<View | null>;
};

const OPTION =
  'h-14 justify-center rounded-btn border-2 border-surface-dark px-4';

/**
 * "O que você quer criar?" — the sheet the tab bar's central "+" opens: the
 * screen behind blurred and dimmed, a white card with a thick navy border and
 * the hard shadow, two wide options and a "Cancelar" link. Rendered as an
 * overlay (not a `Modal`) so the blur can read the tabs behind it; Android's
 * back button closes it.
 */
export function CreateSheet({
  onClose,
  onCreateMatch,
  onCreatePost,
  blurTarget,
}: CreateSheetProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  return (
    <View testID="create-sheet" style={StyleSheet.absoluteFill}>
      {/* Blur and veil both fill the whole screen (tab bar included), behind
          and around the card — not only the strip above it. */}
      <BlurView
        testID="create-sheet-blur"
        intensity={30}
        tint="dark"
        blurMethod="dimezisBlurViewSdk31Plus"
        blurTarget={blurTarget}
        style={StyleSheet.absoluteFill}
      />
      {/* Navy veil over the blur: keeps the dim where the blur falls back.
          It fades in and the card rises in with it, instead of popping. */}
      <Animated.View entering={FadeIn.duration(MOTION.fadeIn)} style={StyleSheet.absoluteFill}>
      <Pressable
        testID="create-sheet-veil"
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        onPress={onClose}
        className="bg-surface-dark/30"
        style={StyleSheet.absoluteFill}
      />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(MOTION.tab.duration).easing(MOTION.tab.easing)}
        className="absolute left-4 right-4 rounded-card border-2 border-surface-dark bg-white px-6 pt-6 pb-4"
        style={{ ...HARD_SHADOW, bottom: insets.bottom + 12 }}
      >
        <Text className="font-display text-h3 text-surface-dark uppercase">
          O que você quer criar?
        </Text>

        <PressableScale
          onPress={onCreateMatch}
          accessibilityRole="button"
          accessibilityLabel="Criar partida"
          className={`${OPTION} mt-4 bg-accent`}
          style={HARD_SHADOW}
        >
          <Text className="font-body-bold text-body-bold text-surface-dark">
            Criar partida
          </Text>
        </PressableScale>

        <PressableScale
          onPress={onCreatePost}
          accessibilityRole="button"
          accessibilityLabel="Criar publicação"
          className={`${OPTION} mt-3 bg-white`}
          style={HARD_SHADOW}
        >
          <Text className="font-body-bold text-body-bold text-surface-dark">
            Criar publicação
          </Text>
        </PressableScale>

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          hitSlop={8}
          className="mt-4 items-center py-2"
        >
          <Text className="font-body-bold text-caption text-text-muted">
            Cancelar
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
