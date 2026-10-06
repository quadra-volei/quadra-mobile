/**
 * DateField — masked DD/MM/AAAA input (introduced in S4).
 *
 * Covers the masking behavior the step-0 birth-date field depends on (raw digits
 * are formatted as DD/MM/AAAA, capped at 8 digits) and the inline error surface.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DateField } from '@/components/ui/DateField';

// lucide Calendar -> inert node (avoids svg internals).
jest.mock('lucide-react-native', () => ({
  Calendar: () => null,
}));

afterEach(async () => {
  cleanup();
  await act(async () => {});
});

describe('DateField', () => {
  it('renders the eyebrow label', async () => {
    const { getByText } = await render(
      <DateField label="DATA DE NASCIMENTO" value="" onChangeText={() => {}} />,
    );
    expect(getByText('DATA DE NASCIMENTO')).toBeTruthy();
  });

  it('masks raw digits as DD/MM/AAAA via onChangeText', async () => {
    const onChangeText = jest.fn();
    const { getByTestId } = await render(
      <DateField
        label="DATA DE NASCIMENTO"
        value=""
        onChangeText={onChangeText}
        testID="df"
      />,
    );
    await act(async () => {
      fireEvent.changeText(getByTestId('df'), '01011990');
    });
    expect(onChangeText).toHaveBeenCalledWith('01/01/1990');
  });

  it('partially masks as digits accrue and caps at 8 digits', async () => {
    const onChangeText = jest.fn();
    const { getByTestId } = await render(
      <DateField
        label="DATA DE NASCIMENTO"
        value=""
        onChangeText={onChangeText}
        testID="df"
      />,
    );
    await act(async () => {
      fireEvent.changeText(getByTestId('df'), '0101');
    });
    expect(onChangeText).toHaveBeenLastCalledWith('01/01');

    await act(async () => {
      fireEvent.changeText(getByTestId('df'), '010119901234');
    });
    expect(onChangeText).toHaveBeenLastCalledWith('01/01/1990');
  });

  it('surfaces an inline error when provided', async () => {
    const { getByText } = await render(
      <DateField
        label="DATA DE NASCIMENTO"
        value="32/01/1990"
        onChangeText={() => {}}
        error="Data inválida"
      />,
    );
    expect(getByText('Data inválida')).toBeTruthy();
  });
});
