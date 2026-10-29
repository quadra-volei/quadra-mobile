import { BlurView } from 'expo-blur';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight, Glasses, Volleyball } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/PressableScale';
import { colors } from '@/theme/colors';

export type SetEndSheetProps = {
  /** Number of the set that just ended ("SET 1 ENCERRADO"). */
  setNumber: number;
  /** The two teams of that set and their final points, side by side. */
  teams: [{ name: string; won: boolean }, { name: string; won: boolean }];
  scores: [number, number];
  onNextSet: () => void;
  onFinish: () => void;
  /** "Continuar jogando", Android back and the veil: close the sheet only. */
  onClose: () => void;
  /** Disables both options while one of them is on its way. */
  busy?: boolean;
};

const SPRING = { damping: 24, stiffness: 240, mass: 0.9 };

/**
 * "O que vem agora?" — the organizer's sheet right after a set ends: the
 * screen behind blurred, the set's final score, "Próximo set" (lime) and
 * "Finalizar partida" (outline on navy), and "Continuar jogando" to close it.
 * Rendered as an overlay (not a `Modal`), like `CreateSheet`.
 */
export function SetEndSheet({
  setNumber,
  teams,
  scores,
  onNextSet,
  onFinish,
  onClose,
  busy = false,
}: SetEndSheetProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const open = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    open.value = withSpring(1, SPRING);
  }, [open]);

  const close = useCallback(() => {
    open.value = withTiming(0, { duration: reduceMotion ? 0 : 180 }, (done) => {
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

  const veil = useAnimatedStyle(() => ({ opacity: open.value }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - open.value) * 480 }] }));

  return (
    <View testID="set-end-sheet" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, veil]}>
        <BlurView
          intensity={30}
          tint="dark"
          blurMethod="dimezisBlurViewSdk31Plus"
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          testID="set-end-veil"
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={close}
          className="bg-surface-dark/60"
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        className="absolute bottom-0 left-0 right-0 rounded-t-card border border-white/10 bg-surface-dark-alt px-6 pt-3"
        style={[{ paddingBottom: insets.bottom + 12 }, sheet]}
      >
        <View className="mb-5 h-1 w-10 self-center rounded-full bg-white/30" />

        <Text className="text-center font-mono text-mono uppercase tracking-widest text-white/60">
          Set {setNumber} encerrado
        </Text>
        <Text className="mt-2 text-center font-display text-display uppercase text-text-on-dark">
          O que vem agora?
        </Text>

        <View className="mt-3 flex-row items-center justify-center gap-6" testID="set-end-score">
          <ScoreColumn team={teams[0]} score={scores[0]} />
          <Text className="mt-4 font-body-bold text-body text-white/40">×</Text>
          <ScoreColumn team={teams[1]} score={scores[1]} />
        </View>

        <View className="mt-6 gap-3">
          <SheetOption
            icon={Volleyball}
            title="Próximo set"
            hint="O vencedor fica e você escolhe quem entra"
            onPress={onNextSet}
            disabled={busy}
            primary
            testID="set-end-next"
          />
          <SheetOption
            icon={Glasses}
            title="Finalizar partida"
            hint="Registrar as estatísticas e escolher o MVP"
            onPress={onFinish}
            disabled={busy}
            testID="set-end-finish"
          />
        </View>

        <Pressable
          onPress={close}
          accessibilityRole="button"
          hitSlop={8}
          className="mt-4 items-center py-2"
          testID="set-end-keep-playing"
        >
          <Text className="font-body-bold text-body-bold text-white/60">Continuar jogando</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/** A team of the set that ended: its name (lime for the winner) over its points. */
function ScoreColumn({ team, score }: { team: { name: string; won: boolean }; score: number }) {
  return (
    <View className="items-center">
      <Text
        className={`font-body-extrabold text-caption uppercase ${team.won ? 'text-accent' : 'text-white/60'}`}
        numberOfLines={1}
      >
        {team.name}
      </Text>
      <Text className="font-num text-num text-text-on-dark">{score}</Text>
    </View>
  );
}

/** One wide option: icon tile, title + hint, chevron. Lime when `primary`. */
function SheetOption({
  icon: Icon,
  title,
  hint,
  onPress,
  disabled,
  primary = false,
  testID,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  onPress: () => void;
  disabled: boolean;
  primary?: boolean;
  testID: string;
}) {
  const ink = primary ? colors.surfaceDark : colors.textOnDark;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${hint}`}
      className={`flex-row items-center gap-4 rounded-card px-4 py-4 ${
        primary ? 'bg-accent' : 'border border-white/15 bg-white/5'
      }`}
      style={{ opacity: disabled ? 0.6 : 1 }}
      testID={testID}
    >
      <View
        className={`h-11 w-11 items-center justify-center rounded-chip ${
          primary ? 'bg-surface-dark/10' : 'bg-white/10'
        }`}
      >
        <Icon size={20} color={ink} />
      </View>
      <View className="flex-1">
        <Text
          className={`font-body-bold text-body-bold ${primary ? 'text-surface-dark' : 'text-text-on-dark'}`}
        >
          {title}
        </Text>
        <Text className={`font-body text-caption ${primary ? 'text-surface-dark/80' : 'text-white/60'}`}>
          {hint}
        </Text>
      </View>
      <ChevronRight size={20} color={ink} />
    </PressableScale>
  );
}
