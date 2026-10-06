import { Text, TextInput, View } from 'react-native';

export type PhoneInputProps = {
  /** National digits only (no country code, no mask), e.g. "11999999999". */
  value: string;
  /** Receives national digits only (mask stripped). */
  onChangeText: (value: string) => void;
  /** Only BR (+55) is supported in MVP; the pill is display-only. */
  country?: 'BR';
  /** Error message — the sole error-surfacing path on the login screen. */
  error?: string;
  testID?: string;
};

const MAX_DIGITS = 11;

/** Formats national digits as "(11) 00000-0000" for display only. */
function formatBR(digits: string): string {
  const d = digits.slice(0, MAX_DIGITS);
  if (d.length === 0) {
    return '';
  }
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length === 0) {
    return `(${ddd}`;
  }
  // 9-digit mobile splits 5+4; 8-digit landline splits 4+4.
  const splitAt = rest.length > 8 ? 5 : 4;
  const first = rest.slice(0, splitAt);
  const second = rest.slice(splitAt);
  if (second.length === 0) {
    return `(${ddd}) ${first}`;
  }
  return `(${ddd}) ${first}-${second}`;
}

/**
 * Phone field with a display-only BR "+55" country pill and a digits-only
 * number entry. Stores/raises national digits; renders a BR mask. Surfaces
 * validation/error text via the `error` prop (danger token) — this is the only
 * error display on the login screen.
 */
export function PhoneInput({
  value,
  onChangeText,
  country = 'BR',
  error,
  testID,
}: PhoneInputProps) {
  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, MAX_DIGITS);
    onChangeText(digits);
  };

  const hasError = Boolean(error);

  return (
    <View>
      <View className="flex-row items-center">
        {/* Country pill — display only (BR +55) */}
        <View
          className="h-12 rounded-chip bg-bg-light-alt px-4 flex-row items-center justify-center mr-2"
          accessibilityRole="text"
          accessibilityLabel={`País ${country}, código +55`}
        >
          <Text className="font-body text-body-bold text-text-primary">{country}</Text>
          <Text className="font-body text-body-bold text-primary ml-1">+55</Text>
        </View>

        <TextInput
          testID={testID}
          value={formatBR(value)}
          onChangeText={handleChange}
          placeholder="(11) 00000-0000"
          placeholderTextColor="#7A7A9A"
          keyboardType="phone-pad"
          inputMode="numeric"
          maxLength={16}
          accessibilityLabel="Número de telefone"
          accessibilityState={{ disabled: false }}
          className={`flex-1 h-12 rounded-chip border bg-white px-4 font-body text-body text-text-primary ${
            hasError ? 'border-danger' : 'border-line'
          }`}
        />
      </View>

      {hasError ? (
        <Text
          className="font-body text-caption text-danger mt-2"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
