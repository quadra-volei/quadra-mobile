import { BlurView } from 'expo-blur';
import type { RefObject } from 'react';
import { useCallback, useEffect } from 'react';
import { BackHandler, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
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

// The card grows out of the tab bar itself: it starts with the bar's frame
// (same sides and bottom, 64 tall, 32 corners, a hairline border) and opens
// upward from the bar's bottom edge, without overshoot so it never pokes past
// the screen; closing folds it back into the bar. The layout hides the bar
// while the sheet is up (DECISIONS #161).
const MORPH = {
  spring: { damping: 26, stiffness: 260, mass: 0.9 },
  closeMs: 180,
  barHeight: 64,
  barRadius: 32,
};

/**
 * "O que você quer criar?" — the sheet the tab bar's central "+" opens: the
 * screen behind blurred and dimmed, a white card with a thick navy border and
 * the hard shadow, two wide options and a "Cancelar" link. The card grows out
 * of the tab bar and folds back into it on close (MORPH). Rendered as an
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
  // The card's full height, known after the first layout: until then it stays
  // the bar's size, so it opens from the bar and not from a guess.
  const height = useSharedValue(0);

  const onContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (height.value > 0) return;
      // + 4: the card's 2px border, top and bottom.
      height.value = e.nativeEvent.layout.height + 4;
      open.value = withSpring(1, MORPH.spring);
    },
    [height, open],
  );

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
  // Height and corners go from the bar's to the card's and the hairline turns
  // into the navy border; the bottom edge stays where the bar's is.
  const card = useAnimatedStyle(() => ({
    height: interpolate(open.value, [0, 1], [MORPH.barHeight, height.value || MORPH.barHeight]),
    borderRadius: interpolate(open.value, [0, 1], [MORPH.barRadius, 20]),
    borderColor: interpolateColor(open.value, [0, 1], [colors.line, colors.surfaceDark]),
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
        style={[{ ...HARD_SHADOW, bottom: insets.bottom + 12, justifyContent: 'flex-end' }, card]}
      >
        {/* Absolute, so its own height (measured once) never follows the card's. */}
        <Animated.View
          style={content}
          className="absolute bottom-0 left-0 right-0 px-6 pt-6 pb-4"
          onLayout={onContentLayout}
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

      </Animated.View>
    </View>
  );
}
