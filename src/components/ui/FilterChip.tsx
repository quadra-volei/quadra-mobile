import { Pressable, Text } from 'react-native';

export type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
};

/**
 * Selectable filter pill for horizontal chip rows (S6 Explore filter row;
 * reused by S11 date/format/level chips and S9/S10 scope/position chips).
 *
 * Controlled and purely presentational — holds no state and never fetches.
 * Selected = blue `bg-primary` fill with white label; unselected = white fill
 * with a hairline `border-line` and primary-text label. Mono uppercase label.
 * Exposes `accessibilityState={{ selected }}` for assistive tech.
 */
export function FilterChip({ label, selected, onPress, testID }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`h-9 px-4 rounded-pill items-center justify-center ${
        selected ? 'bg-primary' : 'bg-white border border-line'
      }`}
    >
      <Text
        className={`font-mono text-mono uppercase ${
          selected ? 'text-text-on-dark' : 'text-text-primary'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
