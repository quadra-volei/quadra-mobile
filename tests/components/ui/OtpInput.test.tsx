/**
 * OtpInput — segmented 4-box auto-advancing OTP field.
 *
 * This is the reusable auth primitive proposed by docs/specs/S3-sms-otp.md
 * ("complex enough to deserve its own tests"). The screen-level acceptance
 * criteria around the boxes (4 boxes, auto-advance, backspace-back) are covered
 * here at the component boundary; the screen test covers them again through the
 * real screen wiring.
 *
 * The repo's tests/__mocks__ are NOT auto-applied, so react-native-reanimated is
 * stubbed inline. The field is controlled: the parent owns the joined `value`,
 * so the test re-renders with the value it wants to assert against (mirroring the
 * S3 screen's local `code` state). Queries are bound to each render result rather
 * than the shared `screen` so React 19's async/concurrent render cannot bleed a
 * detached tree from one case into the next.
 */
import React from 'react';

// reanimated -> Animated.View becomes a plain View; the shake helpers are inert
// so the component renders without the native worklet runtime.
jest.mock('react-native-reanimated', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const AnimatedView = ({ children, style, ...props }: any) =>
    ReactLocal.createElement(View, { ...props, style }, children);
  return {
    __esModule: true,
    default: { View: AnimatedView },
    useSharedValue: (initial: number) => ({ value: initial }),
    withTiming: (to: number) => to,
    withSequence: (...args: number[]) => args[args.length - 1] ?? 0,
    useAnimatedStyle: (cb: () => object) => cb(),
  };
});

import { act, cleanup, fireEvent, render } from '@testing-library/react-native';

import { OtpInput } from '@/components/ui/OtpInput';

// React 19's concurrent renderer schedules a microtask to revert a controlled
// TextInput after a `changeText`/`keyPress`. If that work is still pending when
// the next `render` runs, it tears down the fresh root and queries find nothing.
// Tearing down + flushing between every case keeps each test fully isolated.
afterEach(async () => {
  cleanup();
  await act(async () => {});
});

/**
 * Renders a controlled OtpInput and returns its bound queries + the spy mocks +
 * a `setValue` re-render helper. Bound queries (not the shared `screen`) keep
 * each case fully isolated under the async renderer.
 */
async function renderControlled(
  initial = '',
  extra: Partial<React.ComponentProps<typeof OtpInput>> = {},
) {
  const onChangeText = jest.fn();
  const onFilled = jest.fn();
  const utils = await render(
    <OtpInput value={initial} onChangeText={onChangeText} onFilled={onFilled} testID="otp" {...extra} />,
  );
  const setValue = (next: string, props: Partial<React.ComponentProps<typeof OtpInput>> = {}) =>
    utils.rerender(
      <OtpInput value={next} onChangeText={onChangeText} onFilled={onFilled} testID="otp" {...extra} {...props} />,
    );
  return { ...utils, onChangeText, onFilled, setValue };
}

describe('OtpInput', () => {
  /**
   * Covers: S3 — SMS Verification
   * Criterion: "Exactly 4 boxes are rendered (no 5/6-digit variant)."
   */
  it('renders exactly 4 digit boxes', async () => {
    const { getByTestId, queryByTestId } = await renderControlled();
    expect(getByTestId('otp-box-0')).toBeTruthy();
    expect(getByTestId('otp-box-1')).toBeTruthy();
    expect(getByTestId('otp-box-2')).toBeTruthy();
    expect(getByTestId('otp-box-3')).toBeTruthy();
    // no 5th box -> not a 5/6-digit variant
    expect(queryByTestId('otp-box-4')).toBeNull();
  });

  /**
   * Covers: S3 — SMS Verification
   * Criterion: "typing a digit auto-advances focus to the next box."
   * Asserts the controlled value grows digit-by-digit (auto-advance is a focus
   * side effect the parent observes only as the growing joined value).
   */
  it('appends a typed digit to the joined value at its box position (auto-advance)', async () => {
    // With one digit already present, typing the next digit into the second box
    // appends it — proving input lands at the advanced cursor (joined value grows).
    const { getByTestId, onChangeText } = await renderControlled('1');
    fireEvent.changeText(getByTestId('otp-box-1'), '2');
    expect(onChangeText).toHaveBeenLastCalledWith('12');
  });

  /**
   * Covers: S3 — SMS Verification
   * Criterion: "typing a digit ..." — the first digit into an empty field is
   * reported as the single-character joined value.
   */
  it('reports the first typed digit as the joined value', async () => {
    const { getByTestId, onChangeText } = await renderControlled('');
    fireEvent.changeText(getByTestId('otp-box-0'), '1');
    expect(onChangeText).toHaveBeenLastCalledWith('1');
  });

  /**
   * Covers: S3 — SMS Verification
   * Criterion: "backspace on an empty box moves focus to the previous box."
   * Backspace on an empty box clears the previous digit and moves focus back, so
   * the parent observes the joined value shrink by one.
   */
  it('backspace on an empty box removes the previous digit', async () => {
    // value "12": boxes 0 and 1 are filled, box 2 is empty.
    const { getByTestId, onChangeText } = await renderControlled('12');

    fireEvent(getByTestId('otp-box-2'), 'keyPress', {
      nativeEvent: { key: 'Backspace' },
    });

    expect(onChangeText).toHaveBeenLastCalledWith('1');
  });

  /**
   * Covers: S3 — SMS Verification
   * Criterion: "onFilled fires when all 4 digits are entered" (drives auto-submit).
   */
  it('fires onFilled with the full code when the 4th digit lands', async () => {
    const { getByTestId, onFilled, onChangeText } = await renderControlled('123');

    fireEvent.changeText(getByTestId('otp-box-3'), '4');

    expect(onChangeText).toHaveBeenLastCalledWith('1234');
    expect(onFilled).toHaveBeenCalledWith('1234');
  });

  /**
   * Covers: S3 — SMS Verification
   * Criterion: "incorrect code surfaces the error state (red border)."
   * Verifies the danger border class is applied to the boxes when `error` is set.
   */
  it('applies the danger border on error', async () => {
    const { getByTestId, setValue } = await renderControlled('1234');
    // no error initially
    expect(getByTestId('otp-box-0').props.className).not.toMatch(/border-danger/);

    await setValue('1234', { error: true });
    expect(getByTestId('otp-box-0').props.className).toMatch(/border-danger/);
  });

  /**
   * Covers: S3 — SMS Verification
   * Criterion: each box exposes an accessible label ("Dígito N de 4").
   */
  it('labels each box for screen readers', async () => {
    const { getByLabelText } = await renderControlled();
    expect(getByLabelText('Dígito 1 de 4')).toBeTruthy();
    expect(getByLabelText('Dígito 4 de 4')).toBeTruthy();
  });
});
