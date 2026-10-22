import { Text } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { HARD_SHADOW, colors } from '@/theme/colors';

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
 * Sized and drawn like the app's buttons (DESIGN_SYSTEM "Buttons"): 44px tall,
 * DM Sans bold label, 2px border. Selected = blue `primary` fill, navy border,
 * white label and the hard shadow; unselected = white with a `line` border.
 * `disabled` renders a muted, inert pill (no press, `accessibilityState.disabled`)
 * — used by S9's "Em breve" Bairro/Geral scope tabs. Exposes
 * `accessibilityState={{ selected, disabled }}` for assistive tech.
 *
 * The classNames are the unselected look and never change; the selected and
 * disabled colors are inline styles. A className toggled after the first render
 * is not applied reliably by react-native-css-interop (see `Button`), which
 * left the dark label on the blue fill (DECISIONS #87).
 */
export function FilterChip({
  label,
  selected,
  onPress,
  disabled,
  testID,
}: FilterChipProps) {
  const fill = disabled ? colors.bgLightAlt : selected ? colors.primary : undefined;
  const look = selected && !disabled
    ? { backgroundColor: colors.primary, borderColor: colors.surfaceDark, ...HARD_SHADOW }
    : fill
      ? { backgroundColor: fill }
      : undefined;
  const labelColor = disabled
    ? colors.textMuted
    : selected
      ? colors.textOnDark
      : undefined;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      className="h-11 px-5 rounded-pill items-center justify-center bg-white border-2 border-line"
      style={look}
    >
      <Text
        testID={testID ? `${testID}-label` : undefined}
        className="font-body-bold text-h2 text-text-primary"
        style={labelColor ? { color: labelColor } : undefined}
      >
        {label}
      </Text>
    </PressableScale>
  );
}
