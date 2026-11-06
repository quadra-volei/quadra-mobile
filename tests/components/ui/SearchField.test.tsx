/**
 * SearchField — label-less search input (S6 Explore search bar).
 *
 * The field powers the S6 search criterion (placeholder, type-to-filter via
 * onChangeText, clear via the X). Here we cover the controlled primitive in
 * isolation; the screen-level filtering behavior is covered in
 * tests/features/matches/screens/ExploreScreen.test.tsx.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { SearchField } from '@/components/ui/SearchField';

afterEach(async () => {
  cleanup();
  await act(async () => {});
});

describe('SearchField', () => {
  it('renders the placeholder and current value', async () => {
    await render(
      <SearchField
        value="arena"
        onChangeText={() => {}}
        placeholder="Buscar quadra, bairro ou horário..."
      />,
    );
    const input = screen.getByPlaceholderText(
      'Buscar quadra, bairro ou horário...',
    );
    expect(input.props.value).toBe('arena');
  });

  it('calls onChangeText as the user types', async () => {
    const onChangeText = jest.fn();
    await render(
      <SearchField value="" onChangeText={onChangeText} placeholder="Buscar" />,
    );
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('Buscar'), 'qua');
    });
    expect(onChangeText).toHaveBeenCalledWith('qua');
  });

  it('hides the clear control when the value is empty', async () => {
    await render(
      <SearchField value="" onChangeText={() => {}} onClear={() => {}} />,
    );
    expect(screen.queryByLabelText('Limpar busca')).toBeNull();
  });

  it('shows the clear control and calls onClear when value is present', async () => {
    const onClear = jest.fn();
    await render(
      <SearchField value="arena" onChangeText={() => {}} onClear={onClear} />,
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Limpar busca'));
    });
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('does not show the clear control when no onClear is provided', async () => {
    await render(<SearchField value="arena" onChangeText={() => {}} />);
    expect(screen.queryByLabelText('Limpar busca')).toBeNull();
  });
});
