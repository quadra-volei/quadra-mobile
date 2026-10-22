import { useRef, useState } from 'react';
import { PanResponder, View, type GestureResponderEvent } from 'react-native';

import { HARD_SHADOW } from '@/theme/colors';

export type SliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  accessibilityLabel: string;
  /** What a screen reader says for a value ("Até 12 km"). */
  valueText: (value: number) => string;
  testID?: string;
};

const THUMB = 28;

/**
 * A single-value slider dragged along its track (DESIGN_SYSTEM look: blue fill,
 * white thumb with the navy border and the hard shadow). Touching anywhere on
 * the track jumps there; the drag keeps the gesture from the scroll view around
 * it. Built on React Native's PanResponder, so it also works inside a `Modal`.
 * Screen readers adjust it one step at a time.
 */
export function Slider({ value, min, max, step = 1, onChange, accessibilityLabel, valueText, testID }: SliderProps) {
  const [width, setWidth] = useState(0);
  // The responder is created once; it reads the current props through this ref.
  const latest = useRef({ width, min, max, step, onChange, value });
  latest.current = { width, min, max, step, onChange, value };

  const pick = (e: GestureResponderEvent) => {
    const { width: w, min: lo, max: hi, step: s, onChange: change, value: current } = latest.current;
    const ratio = Math.min(Math.max((e.nativeEvent.locationX - THUMB / 2) / Math.max(w - THUMB, 1), 0), 1);
    const next = Math.min(hi, Math.max(lo, Math.round((lo + ratio * (hi - lo)) / s) * s));
    if (next !== current) change(next);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: pick,
      onPanResponderMove: pick,
    }),
  ).current;

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const thumbLeft = ratio * Math.max(width - THUMB, 0);

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value, text: valueText(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const delta = e.nativeEvent.actionName === 'increment' ? step : -step;
        onChange(Math.min(max, Math.max(min, value + delta)));
      }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      className="h-11 justify-center"
      {...responder.panHandlers}
    >
      {/* Children ignore touches, so locationX is always measured on the track. */}
      <View pointerEvents="none" className="h-2 rounded-full bg-primary/15">
        <View className="h-2 rounded-full bg-primary" style={{ width: thumbLeft + THUMB / 2 }} />
      </View>
      <View
        pointerEvents="none"
        className="absolute rounded-full border-2 border-surface-dark bg-white"
        style={{ width: THUMB, height: THUMB, left: thumbLeft, ...HARD_SHADOW }}
      />
    </View>
  );
}
