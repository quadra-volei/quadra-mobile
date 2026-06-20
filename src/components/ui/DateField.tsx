import { Calendar } from 'lucide-react-native';
import { Text, TextInput, View } from 'react-native';

import { colors } from '@/theme/colors';

export type DateFieldProps = {
  /** Eyebrow / overline label rendered above the field. */
  label: string;
  /** The masked string `DD/MM/AAAA`. The Zod schema validates/parses it. */
  value: string;
  onChangeText: (value: string) => void;
  /** Error message — surfaced below the field in the danger token. */
  error?: string;
  testID?: string;
};

const TEXT_MUTED = '#7A7A9A'; // text-muted token — placeholder color

/** Masks raw digits as `DD/MM/AAAA` (max 8 digits → day/month/year). */
function maskDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  let masked = day;
  if (digits.length > 2) {
    masked += `/${month}`;
  }
  if (digits.length > 4) {
    masked += `/${year}`;
  }
  return masked;
}

/**
 * Masked `DD/MM/AAAA` date field with a leading calendar icon, for RHF-controlled
 * forms. Holds/raises the masked string; the Zod schema validates it as a real
 * past date. No native date-picker dependency — the mockup shows a plain masked
 * field. Surfaces validation via the `error` prop (danger token).
 */
export function DateField({
  label,
  value,
  onChangeText,
  error,
  testID,
}: DateFieldProps) {
  const hasError = Boolean(error);

  return (
    <View>
      <Text className="font-body text-eyebrow text-text-primary uppercase">
        {label}
      </Text>

      <View
        className={`mt-2 h-12 flex-row items-center rounded-chip border bg-white px-4 ${
          hasError ? 'border-danger' : 'border-line'
        }`}
      >
        <View className="mr-2">
          <Calendar size={20} color={colors.primary} />
        </View>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={(text) => onChangeText(maskDate(text))}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={TEXT_MUTED}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={10}
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
