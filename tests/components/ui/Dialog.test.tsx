import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { DialogHost, dialog } from '@/components/ui/Dialog';

describe('Dialog', () => {
  it('shows what was asked, runs the chosen action and closes', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await act(async () => {
      render(<DialogHost />);
    });
    expect(screen.queryByTestId('dialog')).toBeNull();

    await act(async () =>
      dialog.alert('Encerrar o set agora?', 'Quem está na frente leva o set.', [
        { text: 'Cancelar', style: 'cancel', onPress: onCancel },
        { text: 'Encerrar', onPress: onConfirm },
      ]),
    );
    expect(screen.getByText('Encerrar o set agora?')).toBeTruthy();
    expect(screen.getByText('Quem está na frente leva o set.')).toBeTruthy();

    await act(async () => fireEvent.press(screen.getByText('Encerrar')));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('falls back to a single OK for a plain message', async () => {
    await act(async () => {
      render(<DialogHost />);
    });
    await act(async () => dialog.alert('Erro ao sortear', 'Tente novamente.'));

    await act(async () => fireEvent.press(screen.getByText('OK')));
    expect(screen.queryByTestId('dialog')).toBeNull();
  });
});
