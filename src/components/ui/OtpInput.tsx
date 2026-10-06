import { useEffect, useRef } from 'react';
import {
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export type OtpInputProps = {
  /** The joined code, 0–`length` digits. */
  value: string;
  onChangeText: (code: string) => void;
  /** Fixed 4 for MVP (Cognito-locked); default 4. */
  length?: 4;
  /** Drives the red border + shake trigger. */
  error?: boolean;
  autoFocus?: boolean;
  /** Fired when all `length` digits are entered. */
  onFilled?: (code: string) => void;
  testID?: string;
};

const SHAKE_OFFSET = 8; // px horizontal oscillation amplitude on error
const SHAKE_DURATION = 50; // ms per oscillation leg

/**
 * Segmented per-digit OTP field: renders `length` boxes, auto-advances focus on
 * input, moves back on backspace from an empty box, and accepts a pasted /
 * autofilled full code (iOS `oneTimeCode`, Android `sms-otp`) distributed across
 * the boxes. Empty boxes use `border-line`, filled boxes `border-primary`, and
 * `error` swaps to `border-danger` with a brief reanimated shake.
 */
export function OtpInput({
  value,
  onChangeText,
  length = 4,
  error = false,
  autoFocus = false,
  onFilled,
  testID,
}: OtpInputProps) {
  const inputs = useRef<(TextInput | null)[]>([]);
  const translateX = useSharedValue(0);

  const digits = value.split('').slice(0, length);

  // Trigger the shake whenever `error` flips to true.
  useEffect(() => {
    if (error) {
      translateX.value = withSequence(
        withTiming(-SHAKE_OFFSET, { duration: SHAKE_DURATION }),
        withTiming(SHAKE_OFFSET, { duration: SHAKE_DURATION }),
        withTiming(-SHAKE_OFFSET, { duration: SHAKE_DURATION }),
        withTiming(SHAKE_OFFSET, { duration: SHAKE_DURATION }),
        withTiming(0, { duration: SHAKE_DURATION }),
      );
    }
  }, [error, translateX]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const focusAt = (index: number) => {
    if (index >= 0 && index < length) {
      inputs.current[index]?.focus();
    }
  };

  const handleChange = (index: number, text: string) => {
    const incoming = text.replace(/\D/g, '');
    if (incoming.length === 0) {
      return;
    }

    const current = value.split('').slice(0, length);

    // Paste / autofill: a multi-digit chunk fills from the current box onward.
    if (incoming.length > 1) {
      const merged = current.slice(0, index).concat(incoming.split(''));
      const next = merged.slice(0, length).join('');
      onChangeText(next);
      if (next.length >= length) {
        inputs.current[length - 1]?.blur();
        onFilled?.(next);
      } else {
        focusAt(next.length);
      }
      return;
    }

    // Single digit: place it at this box and advance.
    current[index] = incoming;
    const next = current.join('').slice(0, length);
    onChangeText(next);
    if (next.length >= length) {
      inputs.current[index]?.blur();
      onFilled?.(next);
    } else {
      focusAt(index + 1);
    }
  };

  const handleKeyPress = (
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (e.nativeEvent.key === 'Backspace') {
      const current = value.split('').slice(0, length);
      if (current[index]) {
        // Clear this box's digit.
        current[index] = '';
        onChangeText(current.join('').replace(/\s/g, ''));
      } else if (index > 0) {
        // Empty box → clear the previous and move focus back.
        const prev = current.slice(0, index - 1);
        onChangeText(prev.join(''));
        focusAt(index - 1);
      }
    }
  };

  const borderClass = (index: number) => {
    if (error) {
      return 'border-danger';
    }
    return digits[index] ? 'border-primary' : 'border-line';
  };

  return (
    <Animated.View style={shakeStyle} className="flex-row justify-between" testID={testID}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          testID={testID ? `${testID}-box-${index}` : undefined}
          value={digits[index] ?? ''}
          onChangeText={(text) => handleChange(index, text)}
          onKeyPress={(e) => handleKeyPress(index, e)}
          autoFocus={autoFocus && index === 0}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={length}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          selectTextOnFocus
          accessibilityLabel={`Dígito ${index + 1} de ${length}`}
          className={`h-16 w-16 rounded-card border-2 bg-white text-center font-num text-num text-text-primary ${borderClass(index)}`}
        />
      ))}
    </Animated.View>
  );
}
