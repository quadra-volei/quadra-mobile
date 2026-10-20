/**
 * PressableScale — the app's press feedback (DECISIONS #109). The animation
 * itself runs on the UI thread; here we cover what the wrapper must not break:
 * a static opacity (a disabled Button) survives the animated style, and the
 * caller's press handlers still run.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';

describe('PressableScale', () => {
  it('keeps a static opacity from style at rest', async () => {
    await render(
      <PressableScale testID="p" style={{ opacity: 0.5 }}>
        <Text>Ok</Text>
      </PressableScale>,
    );
    expect(StyleSheet.flatten(screen.getByTestId('p').props.style).opacity).toBe(0.5);
  });

  it('forwards onPress and onPressIn', async () => {
    const onPress = jest.fn();
    const onPressIn = jest.fn();
    await render(
      <PressableScale testID="p" onPress={onPress} onPressIn={onPressIn}>
        <Text>Ok</Text>
      </PressableScale>,
    );
    await fireEvent(screen.getByTestId('p'), 'pressIn');
    await fireEvent.press(screen.getByTestId('p'));
    expect(onPressIn).toHaveBeenCalled();
    expect(onPress).toHaveBeenCalled();
  });
});
