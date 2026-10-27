import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Button } from '@/components/ui/Button';
import { useRecordTour } from '@/features/tour/api/recordTour';
import { TOUR_LAST_PHASE, useTourStore } from '@/features/tour/tourStore';
import { TOUR_STEPS, TOUR_VERSION } from '@/features/tour/tourSteps';
import { measureTourTarget, type TourRect } from '@/features/tour/tourTargets';
import { useAuthStore } from '@/stores/auth';
import { HARD_SHADOW, colors } from '@/theme/colors';
import { MOTION } from '@/theme/motion';

// Room around the highlighted item, and between the highlight and the card.
const HOLE_PADDING = 10;
const CARD_GAP = 16;

/**
 * The first-access tour (DECISIONS #190): a welcome card, then the screen
 * dimmed with a hole over one tab bar item and a card above it. Driven by
 * `useTourStore`; mounted once, over the tabs. Leaving it, by "Concluir",
 * "Pular", "Agora não" or back, records the outcome on the account.
 */
export function TourOverlay() {
  const phase = useTourStore((s) => s.phase);
  const next = useTourStore((s) => s.next);
  const close = useTourStore((s) => s.close);
  const markSeen = useTourStore((s) => s.markSeen);
  const userId = useAuthStore((s) => s.userId);
  const record = useRecordTour();

  const step = typeof phase === 'number' && phase > 0 ? TOUR_STEPS[phase - 1] : undefined;
  const [rect, setRect] = useState<TourRect | null>(null);

  // Measure the step's target each time the step changes. A target that is not
  // mounted (keyboard up, sheet open) skips its step instead of pointing at nothing.
  useEffect(() => {
    if (!step) {
      setRect(null);
      return;
    }
    let active = true;
    setRect(null);
    void measureTourTarget(step.target).then((measured) => {
      if (!active) return;
      if (measured) {
        setRect(measured);
      } else {
        next();
      }
    });
    return () => {
      active = false;
    };
  }, [step, next]);

  if (phase === 'closed') return null;

  const finish = (outcome: 'Completed' | 'Skipped') => {
    close();
    if (userId) markSeen(userId, TOUR_VERSION);
    record.mutate({ version: TOUR_VERSION, outcome, lastStep: phase });
  };
  const advance = () => (phase >= TOUR_LAST_PHASE ? finish('Completed') : next());

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => finish('Skipped')}
    >
      {phase === 0 ? (
        <WelcomeCard onStart={next} onLater={() => finish('Skipped')} />
      ) : step && rect ? (
        <Spotlight
          rect={rect}
          index={phase}
          title={step.title}
          body={step.body}
          isLast={phase >= TOUR_LAST_PHASE}
          onNext={advance}
          onSkip={() => finish('Skipped')}
        />
      ) : null}
    </Modal>
  );
}

function WelcomeCard({ onStart, onLater }: { onStart: () => void; onLater: () => void }) {
  return (
    <View className="flex-1 items-center justify-center bg-surface-dark/70 px-6">
      <Animated.View
        entering={FadeIn.duration(MOTION.fadeIn)}
        accessibilityViewIsModal
        testID="tour-welcome"
        className="self-stretch rounded-card bg-surface-dark p-6"
      >
        <Text
          className="font-body-bold text-eyebrow text-accent uppercase"
          style={{ letterSpacing: 1.5 }}
        >
          Primeiro acesso
        </Text>
        <Text className="mt-3 font-display text-display text-white uppercase">Bem-vindo</Text>
        <Text className="font-display text-display text-accent uppercase">ao Quadra</Text>
        <Text className="mt-4 font-body text-body text-text-on-dark">
          Em {TOUR_STEPS.length} toques você conhece o app. Leva menos de um minuto.
        </Text>
        <View className="mt-6 gap-3">
          <Button variant="grad" onPress={onStart} testID="tour-start">
            Começar
          </Button>
          <Button variant="outlineW" onPress={onLater} testID="tour-later">
            Agora não
          </Button>
        </View>
      </Animated.View>
    </View>
  );
}

function Spotlight({
  rect,
  index,
  title,
  body,
  isLast,
  onNext,
  onSkip,
}: {
  rect: TourRect;
  index: number;
  title: string;
  body: string;
  isLast: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const r = Math.max(rect.width, rect.height) / 2 + HOLE_PADDING;
  // The screen with a round hole over the target (even-odd fill).
  const veil =
    `M0 0H${width}V${height}H0Z` +
    `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

  return (
    <View className="flex-1">
      <Svg width={width} height={height} style={{ position: 'absolute' }}>
        <Path d={veil} fill={colors.surfaceDark} fillOpacity={0.7} fillRule="evenodd" />
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.accent} strokeWidth={3} />
      </Svg>
      {/* The tab bar sits at the bottom, so the card always goes above the hole. */}
      <Animated.View
        key={index}
        entering={FadeIn.duration(MOTION.fadeIn)}
        accessibilityViewIsModal
        testID={`tour-step-${index}`}
        className="absolute left-4 right-4 rounded-card border-2 border-surface-dark bg-white p-5"
        style={[HARD_SHADOW, { bottom: height - (cy - r) + CARD_GAP }]}
      >
        <Text className="font-body-bold text-eyebrow text-primary uppercase" style={{ letterSpacing: 1.5 }}>
          {index} de {TOUR_STEPS.length}
        </Text>
        <Text accessibilityRole="header" className="mt-1 font-body-extrabold text-h3 text-text-primary">
          {title}
        </Text>
        <Text className="mt-1 font-body text-body text-text-muted">{body}</Text>
        <View className="mt-4 flex-row items-center justify-between">
          {isLast ? (
            <View />
          ) : (
            <Pressable onPress={onSkip} accessibilityRole="button" hitSlop={12} testID="tour-skip">
              <Text className="font-body-semibold text-body-bold text-text-muted">Pular</Text>
            </Pressable>
          )}
          <Button variant="grad" onPress={onNext} testID="tour-next">
            {isLast ? 'Concluir' : 'Próximo'}
          </Button>
        </View>
      </Animated.View>
    </View>
  );
}
