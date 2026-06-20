/**
 * TextField — reusable labeled text input (introduced in S4).
 *
 * Covers the props the onboarding step-0 fields depend on: the eyebrow label, the
 * controlled value/onChangeText, the left adornment (the "@"), the right slot
 * badge, and the inline error surface (danger token, polite live region).
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { TextField } from '@/components/ui/TextField';

afterEach(async () => {
  cleanup();
  await act(async () => {});
});

describe('TextField', () => {
  it('renders the eyebrow label and the controlled value', async () => {
    const { getByText, getByTestId } = await render(
      <TextField
        label="NOME"
        value="Renan"
        onChangeText={() => {}}
        testID="tf"
      />,
    );
    expect(getByText('NOME')).toBeTruthy();
    expect(getByTestId('tf').props.value).toBe('Renan');
  });

  it('calls onChangeText as the user types', async () => {
    const onChangeText = jest.fn();
    const { getByTestId } = await render(
      <TextField
        label="NOME"
        value=""
        onChangeText={onChangeText}
        testID="tf"
      />,
    );
    await act(async () => {
      fireEvent.changeText(getByTestId('tf'), 'R');
    });
    expect(onChangeText).toHaveBeenCalledWith('R');
  });

  it('renders the left adornment and the right slot', async () => {
    const { getByText } = await render(
      <TextField
        label="APELIDO"
        value=""
        onChangeText={() => {}}
        leftAdornment={<Text>@</Text>}
        rightSlot={<Text>SEU @ NA QUADRA</Text>}
      />,
    );
    expect(getByText('@')).toBeTruthy();
    expect(getByText('SEU @ NA QUADRA')).toBeTruthy();
  });

  it('surfaces the inline error in a polite live region and is absent otherwise', async () => {
    const { queryByText, getByText, rerender } = await render(
      <TextField label="NOME" value="" onChangeText={() => {}} />,
    );
    expect(queryByText('Informe seu nome')).toBeNull();

    await rerender(
      <TextField
        label="NOME"
        value=""
        onChangeText={() => {}}
        error="Informe seu nome"
      />,
    );
    const err = getByText('Informe seu nome');
    expect(err.props.accessibilityLiveRegion).toBe('polite');
  });
});
