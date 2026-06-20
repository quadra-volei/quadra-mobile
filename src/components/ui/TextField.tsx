import type { ReactNode } from 'react';
import { Text, TextInput, View } from 'react-native';

export type TextFieldProps = {
  /** Eyebrow / overline label rendered above the field. */
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** Error message — surfaced below the field in the danger token. */
  error?: string;
  /** Optional content rendered inside the field, before the input (e.g. "@"). */
  leftAdornment?: ReactNode;
  /** Optional content rendered to the right of the label row (e.g. a badge). */
  rightSlot?: ReactNode;
  autoCapitalize?: 'none' | 'words';
  maxLength?: number;
  testID?: string;
};

const TEXT_MUTED = '#7A7A9A'; // text-muted token — placeholder color

/**
 * Generic labeled text field for RHF-controlled forms (eyebrow label, optional
 * left adornment + right slot, inline error). Used across onboarding/profile/
 * match-create screens. Surfaces validation via the `error` prop (danger token),
 * consistent with PhoneInput.
 */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  leftAdornment,
  rightSlot,
  autoCapitalize = 'none',
  maxLength,
  testID,
}: TextFieldProps) {
  const hasError = Boolean(error);

  // No `flex-1` here: inside a vertical ScrollView that would collapse the field
  // to zero height. Callers that need side-by-side fields wrap them in `flex-1`.
  return (
    <View>
      <View className="flex-row items-center justify-between gap-2">
        <Text
          numberOfLines={1}
          className="shrink font-body text-eyebrow text-text-primary uppercase"
        >
          {label}
        </Text>
        {rightSlot}
      </View>

      <View
        className={`mt-2 h-12 flex-row items-center rounded-chip border bg-white px-4 ${
          hasError ? 'border-danger' : 'border-line'
        }`}
      >
        {leftAdornment ? <View className="mr-2">{leftAdornment}</View> : null}
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={TEXT_MUTED}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          accessibilityLabel={label}
          className="flex-1 font-body text-body text-text-primary"
        />
      </View>

      {hasError ? (
        <Text
          className="mt-2 font-body text-caption text-danger"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
