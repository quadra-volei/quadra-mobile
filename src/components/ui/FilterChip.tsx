import { Pressable, Text } from 'react-native';

import { colors } from '@/theme/colors';
import { PRESS_RIPPLE } from '@/theme/layout';

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
 * Selected = blue `primary` fill with white label; unselected = white fill
 * with a hairline `border-line` and primary-text label. Mono uppercase label.
 * `disabled` renders a muted, inert pill (no press, `accessibilityState.disabled`)
 * — used by S9's "Em breve" Bairro/Geral scope tabs. Exposes
 * `accessibilityState={{ selected, disabled }}` for assistive tech.
 *
 * The classNames are the unselected look and never change; the selected and
 * disabled colors are inline styles. A className toggled after the first render
 * is not applied reliably by react-native-css-interop (see `Button`), which
 * left the dark label on the blue fill (DECISIONS #82).
 */
export function FilterChip({
  label,
  selected,
  onPress,
  disabled,
  testID,
}: FilterChipProps) {
  const fill = disabled ? colors.bgLightAlt : selected ? colors.primary : undefined;
  const labelColor = disabled
    ? colors.textMuted
    : selected
      ? colors.textOnDark
      : undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      android_ripple={PRESS_RIPPLE}
      className="h-9 px-4 rounded-pill items-center justify-center overflow-hidden bg-white border border-line"
      style={fill ? { backgroundColor: fill, borderColor: fill } : undefined}
    >
      <Text
        testID={testID ? `${testID}-label` : undefined}
        className="font-mono text-mono uppercase text-text-primary"
        style={labelColor ? { color: labelColor } : undefined}
      >
        {label}
      </Text>
    </Pressable>
  );
}
