/**
 * FilterChip — selectable filter pill (S6 Explore filter row).
 *
 * The chip is the building block behind several S6 acceptance criteria
 * (selectable filter row, default highlight, selecting updates the highlight).
 * Here we cover the primitive in isolation: it renders its label, exposes its
 * selected state to assistive tech, and forwards taps via onPress.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { FilterChip } from '@/components/ui/FilterChip';

afterEach(async () => {
  cleanup();
  await act(async () => {});
});

describe('FilterChip', () => {
  it('renders the label', async () => {
    await render(
      <FilterChip label="Iniciante" selected={false} onPress={() => {}} />,
    );
    expect(screen.getByText('Iniciante')).toBeTruthy();
  });

  it('exposes its selected state via accessibilityState', async () => {
    await render(
      <FilterChip
        label="Todos"
        selected
        onPress={() => {}}
        testID="chip-todos"
      />,
    );
    expect(
      screen.getByTestId('chip-todos').props.accessibilityState?.selected,
    ).toBe(true);
  });

  it('exposes selected=false when unselected', async () => {
    await render(
      <FilterChip
        label="Perto"
        selected={false}
        onPress={() => {}}
        testID="chip-perto"
      />,
    );
    expect(
      screen.getByTestId('chip-perto').props.accessibilityState?.selected,
    ).toBe(false);
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await render(
      <FilterChip label="6x6" selected={false} onPress={onPress} />,
    );
    await act(async () => {
      fireEvent.press(screen.getByText('6x6'));
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
