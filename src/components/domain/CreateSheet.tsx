import { BlurView } from 'expo-blur';
import { Plus } from 'lucide-react-native';
import type { RefObject } from 'react';
import { useCallback, useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/PressableScale';
import { HARD_SHADOW, colors } from '@/theme/colors';

export type CreateSheetProps = {
  onClose: () => void;
  onCreateMatch: () => void;
  onCreatePost: () => void;
  /** What the backdrop blurs on Android (a `BlurTargetView` behind the sheet). */
  blurTarget?: RefObject<View | null>;
};

const OPTION =
  'h-14 justify-center rounded-btn border-2 border-surface-dark px-4';

// The card grows out of the tab bar's lime "+": it starts as a lime blob the
// size of the button over it (scaled from its bottom centre, lifted onto the
// button) and springs open with a small overshoot; closing shrinks it back.
const MORPH = {
  spring: { damping: 15, stiffness: 240, mass: 0.9 },
  closeMs: 170,
  from: { scaleX: 0.18, scaleY: 0.24, lift: -24, radius: 160 },
};

/**
 * "O que você quer criar?" — the sheet the tab bar's central "+" opens: the
 * screen behind blurred and dimmed, a white card with a thick navy border and
 * the hard shadow, two wide options and a "Cancelar" link. The card grows out
 * of the "+" and folds back into it on close (MORPH). Rendered as an
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
  const reduceMotion = useReducedMotion();
  const open = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    open.value = withSpring(1, MORPH.spring);
  }, [open]);

  // Back, the veil and "Cancelar" fold the card back into the "+" first.
  const close = useCallback(() => {
    open.value = withTiming(0, { duration: reduceMotion ? 0 : MORPH.closeMs }, (done) => {
      if (done) runOnJS(onClose)();
    });
  }, [open, onClose, reduceMotion]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [close]);

  const veil = useAnimatedStyle(() => ({
    opacity: interpolate(open.value, [0, 0.6], [0, 1], Extrapolation.CLAMP),
  }));
  const card = useAnimatedStyle(() => ({
    opacity: interpolate(open.value, [0, 0.08], [0, 1], Extrapolation.CLAMP),
    borderRadius: interpolate(open.value, [0, 1], [MORPH.from.radius, 20]),
    transform: [
      { translateY: interpolate(open.value, [0, 1], [MORPH.from.lift, 0]) },
      { scaleX: interpolate(open.value, [0, 1], [MORPH.from.scaleX, 1]) },
      { scaleY: interpolate(open.value, [0, 1], [MORPH.from.scaleY, 1]) },
    ],
  }));
  // The lime of the "+" fades off the card as it opens; the content fades in.
  const lime = useAnimatedStyle(() => ({
    opacity: interpolate(open.value, [0.2, 0.7], [1, 0], Extrapolation.CLAMP),
  }));
  // The "+" keeps its size while the card under it stretches, and turns.
  const plus = useAnimatedStyle(() => ({
    transform: [
      { scaleX: 1 / interpolate(open.value, [0, 1], [MORPH.from.scaleX, 1]) },
      { scaleY: 1 / interpolate(open.value, [0, 1], [MORPH.from.scaleY, 1]) },
      { rotate: `${interpolate(open.value, [0, 1], [0, 90])}deg` },
    ],
  }));
  const content = useAnimatedStyle(() => ({
    opacity: interpolate(open.value, [0.55, 1], [0, 1], Extrapolation.CLAMP),
  }));

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
          It fades in while the card opens, instead of popping. */}
      <Animated.View style={[StyleSheet.absoluteFill, veil]}>
      <Pressable
        testID="create-sheet-veil"
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        onPress={close}
        className="bg-surface-dark/30"
        style={StyleSheet.absoluteFill}
      />
      </Animated.View>

      <Animated.View
        className="absolute left-4 right-4 overflow-hidden rounded-card border-2 border-surface-dark bg-white"
        style={[{ ...HARD_SHADOW, bottom: insets.bottom + 12, transformOrigin: 'bottom' }, card]}
      >
        <Animated.View style={content} className="px-6 pt-6 pb-4">
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
            onPress={close}
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

        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center bg-accent"
          style={lime}
        >
          <Animated.View style={plus}>
            <Plus size={30} color={colors.surfaceDark} strokeWidth={2.6} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
