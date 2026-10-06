import { Minus, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export type StepperFieldProps = {
  /** Eyebrow caption above the value (e.g. "Jogadores", "Valor / pessoa"). */
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Optional value prefix (e.g. "R$ "). */
  prefix?: string;
  testID?: string;
};

/**
 * Boxed numeric stepper with a large `font-num` value and −/+ controls.
 * Fills the gap `TextField` (free text) doesn't cover for the S11
 * "Jogadores" / "Valor / pessoa" fields. Controlled — clamps to `[min, max]`.
 *
 * The root `View` is `flex-1` so two steppers sit side-by-side in a
 * `flex-row gap-4` row (mirrors `TextField`'s side-by-side convention).
 */
export function StepperField({
  label,
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  prefix,
  testID,
}: StepperFieldProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  const decrement = () => onChange(clamp(value - step));
  const increment = () => onChange(clamp(value + step));

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View className="flex-1 rounded-chip border border-line bg-white px-4 py-3">
      <Text
        numberOfLines={1}
        className="font-body text-eyebrow text-text-muted uppercase"
      >
        {label}
      </Text>
      <View className="mt-2 flex-row items-center justify-between">
        <Pressable
          onPress={decrement}
          disabled={atMin}
          accessibilityRole="button"
          accessibilityLabel={`Diminuir ${label}`}
          accessibilityState={{ disabled: atMin }}
          testID={testID ? `${testID}-decrement` : undefined}
          className="h-8 w-8 items-center justify-center rounded-full bg-bg-light-alt"
          style={atMin ? { opacity: 0.5 } : undefined}
        >
          <Minus size={16} color={colors.surfaceDark} />
        </Pressable>

        <Text
          accessibilityLabel={`${label}: ${prefix ?? ''}${value}`}
          testID={testID}
          className="font-num text-h3 text-text-primary"
        >
          {prefix ?? ''}
          {value}
        </Text>

        <Pressable
          onPress={increment}
          disabled={atMax}
          accessibilityRole="button"
          accessibilityLabel={`Aumentar ${label}`}
          accessibilityState={{ disabled: atMax }}
          testID={testID ? `${testID}-increment` : undefined}
          className="h-8 w-8 items-center justify-center rounded-full bg-primary"
          style={atMax ? { opacity: 0.5 } : undefined}
        >
          <Plus size={16} color={colors.textOnDark} />
        </Pressable>
      </View>
    </View>
  );
}
