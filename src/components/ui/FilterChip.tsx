import { Pressable, Text } from 'react-native';

export type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** When true the chip is inert (no-op press, muted style, a11y disabled). */
  disabled?: boolean;
  testID?: string;
};

/**
 * Selectable filter pill for horizontal chip rows (S6 Explore filter row;
 * reused by S11 date/format/level chips and S9/S10 scope/position chips).
 *
 * Controlled and purely presentational — holds no state and never fetches.
 * Selected = blue `bg-primary` fill with white label; unselected = white fill
 * with a hairline `border-line` and primary-text label. Mono uppercase label.
 * `disabled` renders a muted, inert pill (no press, `accessibilityState.disabled`)
 * — used by S9's "Em breve" Bairro/Geral scope tabs. Exposes
 * `accessibilityState={{ selected, disabled }}` for assistive tech.
 */
export function FilterChip({
  label,
  selected,
  onPress,
  disabled,
  testID,
}: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      className={`h-9 px-4 rounded-pill items-center justify-center ${
        disabled
          ? 'bg-bg-light-alt'
          : selected
            ? 'bg-primary'
            : 'bg-white border border-line'
      }`}
    >
      <Text
        className={`font-mono text-mono uppercase ${
          disabled
            ? 'text-text-muted'
            : selected
              ? 'text-text-on-dark'
              : 'text-text-primary'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
