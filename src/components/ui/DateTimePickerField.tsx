import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { Calendar, Clock } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/colors';

export type DateTimePickerFieldMode = 'date' | 'time';

export type DateTimePickerFieldProps = {
  /** `'date'` raises `DD/MM/AAAA`; `'time'` raises `HHhMM`. */
  mode: DateTimePickerFieldMode;
  /** Masked string — `DD/MM/AAAA` (date) or `HHhMM` (time). Empty ⇒ placeholder. */
  value: string;
  /** Raises the masked string once the user confirms a value. */
  onChange: (masked: string) => void;
  /** Optional eyebrow / overline label rendered above the field. */
  label?: string;
  /** Placeholder shown while `value` is empty. */
  placeholder?: string;
  /** Lower bound passed to the native picker (e.g. today, for a future match). */
  minimumDate?: Date;
  /** Upper bound passed to the native picker. */
  maximumDate?: Date;
  /** Error message — surfaced below the field in the danger token. */
  error?: string;
  testID?: string;
};

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Date → `DD/MM/AAAA`. */
function formatBrDate(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Date → `HHhMM` (24h). */
function formatHhMm(d: Date): string {
  return `${pad2(d.getHours())}h${pad2(d.getMinutes())}`;
}

/** `DD/MM/AAAA` → Date (validated), else null. */
function parseBrDate(value: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
    ? d
    : null;
}

/** `HHhMM` → today's Date at that time (validated), else null. */
function parseHhMm(value: string): Date | null {
  const m = /^(\d{1,2})h(\d{2})$/.exec(value);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Evening default (19h00) for an empty time field. */
function defaultTime(): Date {
  const d = new Date();
  d.setHours(19, 0, 0, 0);
  return d;
}

/**
 * Tap-to-open native date/time field. Renders a chip-styled trigger (leading
 * calendar/clock icon + the selected value or a placeholder); tapping it opens
 * the OS picker widget — an Android dialog (imperative `DateTimePickerAndroid`)
 * or an iOS spinner in a bottom sheet with a "Confirmar" action.
 *
 * The field owns/raises the same masked strings the schema expects (`DD/MM/AAAA`
 * for dates, `HHhMM` for times), so it drops into RHF-controlled forms in place
 * of a masked `TextField`/`DateField` without touching validation.
 */
export function DateTimePickerField({
  mode,
  value,
  onChange,
  label,
  placeholder,
  minimumDate,
  maximumDate,
  error,
  testID,
}: DateTimePickerFieldProps) {
  const parsed = mode === 'date' ? parseBrDate(value) : parseHhMm(value);
  const fallback =
    mode === 'date' ? (minimumDate ?? new Date()) : defaultTime();
  const current = parsed ?? fallback;

  // iOS presents the picker in a sheet with a confirm step; `temp` holds the
  // in-progress value until the user commits. Android commits inline.
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState<Date>(current);

  const Icon = mode === 'date' ? Calendar : Clock;
  const hasValue = value.length > 0;
  const hasError = Boolean(error);
  const displayPlaceholder =
    placeholder ?? (mode === 'date' ? 'DD/MM/AAAA' : 'HHhMM');

  const commit = (d: Date) =>
    onChange(mode === 'date' ? formatBrDate(d) : formatHhMm(d));

  const openPicker = () => {
    setTemp(current);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode,
        is24Hour: true,
        minimumDate,
        maximumDate,
        // onValueChange fires only on confirm; dismissal is a no-op (keeps value).
        onValueChange: (_event, date) => commit(date),
      });
    } else {
      setOpen(true);
    }
  };

  return (
    <View>
      {label ? (
        <Text className="font-body text-eyebrow text-text-primary uppercase">
          {label}
        </Text>
      ) : null}

      <Pressable
        testID={testID}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={
          label ?? (mode === 'date' ? 'Escolher data' : 'Escolher horário')
        }
        className={`${label ? 'mt-2 ' : ''}h-12 flex-row items-center rounded-chip border bg-white px-4 ${
          hasError ? 'border-danger' : 'border-line'
        }`}
      >
        <View className="mr-2">
          <Icon size={20} color={colors.primary} />
        </View>
        <Text
          className={`flex-1 font-body text-body ${
            hasValue ? 'text-text-primary' : 'text-text-muted'
          }`}
        >
          {hasValue ? value : displayPlaceholder}
        </Text>
      </Pressable>

      {hasError ? (
        <Text
          className="mt-2 font-body text-caption text-danger"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}

      {Platform.OS === 'ios' && open ? (
        <Modal
          transparent
          animationType="fade"
          visible
          onRequestClose={() => setOpen(false)}
        >
          <Pressable
            className="flex-1 justify-end bg-black/40"
            onPress={() => setOpen(false)}
          >
            {/* Swallow taps on the sheet so they don't dismiss the backdrop. */}
            <Pressable
              className="rounded-t-card bg-white px-4 pb-6 pt-3"
              onPress={() => {}}
            >
              <DateTimePicker
                testID={testID ? `${testID}-picker` : undefined}
                value={temp}
                mode={mode}
                is24Hour
                display="spinner"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onValueChange={(_event, date) => setTemp(date)}
              />
              <Button
                variant="grad"
                testID={testID ? `${testID}-confirm` : undefined}
                onPress={() => {
                  commit(temp);
                  setOpen(false);
                }}
              >
                Confirmar
              </Button>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
