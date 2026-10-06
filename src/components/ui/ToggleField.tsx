import type { ReactNode } from 'react';
import { Switch, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export type ToggleFieldProps = {
  /** Optional leading icon (e.g. a lucide `Lock`). */
  icon?: ReactNode;
  title: string;
  caption?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  testID?: string;
};

// Native Switch track/thumb colors (the Switch styles via props, not className).
const SWITCH_TRACK_OFF = '#E8EEF8'; // bg-light-alt token
const SWITCH_TRACK_ON = colors.primary; // primary token (active track)
const SWITCH_THUMB = colors.textOnDark; // white thumb

/**
 * Boolean switch row: optional leading icon + title + caption + native `Switch`.
 * Fills the gap for the S11 "PRIVACIDADE / Partida aberta" control. Controlled.
 * The `Switch` carries the accessible label/state; the whole row is a card.
 */
export function ToggleField({
  icon,
  title,
  caption,
  value,
  onValueChange,
  testID,
}: ToggleFieldProps) {
  return (
    <View className="mt-2 flex-row items-center rounded-card border border-line bg-white px-4 py-4">
      {icon ? <View className="mr-3">{icon}</View> : null}
      <View className="flex-1">
        <Text className="font-body text-h3 text-text-primary">{title}</Text>
        {caption ? (
          <Text className="mt-0.5 font-body text-caption text-text-muted">
            {caption}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        testID={testID}
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityState={{ checked: value }}
        trackColor={{ false: SWITCH_TRACK_OFF, true: SWITCH_TRACK_ON }}
        thumbColor={SWITCH_THUMB}
      />
    </View>
  );
}
