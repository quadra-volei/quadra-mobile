/**
 * S10 — Notifications sub-screen tests (`app/profile/notifications.tsx`).
 *
 * Covers the notifications acceptance criteria of docs/specs/S10-settings.md:
 *  - The sub-screen shows exactly three coarse switches (Convites, Lembretes,
 *    Ranking).
 *  - Toggling each persists via useNotificationPrefsStore (the store owns
 *    AsyncStorage persistence — verified in
 *    tests/features/profile/stores/notificationPrefs.test.ts).
 *  - Header shows a back affordance + the "NOTIFICAÇÕES" display title; back
 *    returns to the previous screen; no bottom tab bar.
 *
 * The prefs store is mocked at the boundary with a synchronous, stateful stub
 * (no AsyncStorage, no async rehydration) so the screen test stays deterministic.
 * Native modules (safe-area, lucide) are stubbed inline — tests/__mocks__ are NOT
 * auto-applied.
 */
import React from 'react';

// --- Native / module mocks ------------------------------------------------

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      ReactLocal.createElement(View, props, children),
  };
});

jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) =>
    ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  return { ChevronLeft: stub('chevron-left') };
});

// expo-router: spyable router.back.
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: (...args: any[]) => mockBack(...args),
  },
}));

// Notification-prefs store mocked at the boundary: a synchronous, stateful stub.
type Prefs = { invites: boolean; reminders: boolean; ranking: boolean };
const mockPrefs: Prefs = { invites: true, reminders: true, ranking: true };
const mockSetInvites = jest.fn((v: boolean) => {
  mockPrefs.invites = v;
});
const mockSetReminders = jest.fn((v: boolean) => {
  mockPrefs.reminders = v;
});
const mockSetRanking = jest.fn((v: boolean) => {
  mockPrefs.ranking = v;
});
jest.mock('@/stores/notificationPrefs', () => {
  const state = () => ({
    invites: mockPrefs.invites,
    reminders: mockPrefs.reminders,
    ranking: mockPrefs.ranking,
    setInvites: mockSetInvites,
    setReminders: mockSetReminders,
    setRanking: mockSetRanking,
  });
  const useNotificationPrefsStore: any = (selector: any) => selector(state());
  useNotificationPrefsStore.getState = state;
  useNotificationPrefsStore.setState = (partial: any) => {
    Object.assign(
      mockPrefs,
      typeof partial === 'function' ? partial(state()) : partial,
    );
  };
  return { useNotificationPrefsStore };
});

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import { useNotificationPrefsStore } from '@/stores/notificationPrefs';

import NotificationsScreen from '../../../../app/profile/notifications';

async function renderScreen() {
  await act(async () => {
    render(<NotificationsScreen />);
  });
}

beforeEach(() => {
  mockBack.mockClear();
  mockSetInvites.mockClear();
  mockSetReminders.mockClear();
  mockSetRanking.mockClear();
  // Reset the (mocked) prefs store to the default (all on) before each test.
  useNotificationPrefsStore.setState({
    invites: true,
    reminders: true,
    ranking: true,
  });
});

afterEach(() => {
  cleanup();
});

describe('S10 — Notifications sub-screen', () => {
  // ------------------------------------------------------------------- header
  /**
   * Covers: S10 — Settings
   * Criterion: header shows a back affordance + the "NOTIFICAÇÕES" display title
   *  (uppercase, font-display); back returns to the previous screen.
   */
  it('renders the NOTIFICAÇÕES header with a working back affordance', async () => {
    await renderScreen();

    const title = screen.getByText('Notificações');
    expect(title.props.className).toContain('font-display');
    expect(title.props.className).toContain('uppercase');

    fireEvent.press(screen.getByLabelText('Voltar'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------- exactly 3 switches
  /**
   * Covers: S10 — Settings
   * Criterion: "The Notifications sub-screen shows exactly three coarse switches
   *  (Convites, Lembretes, Ranking)."
   */
  it('shows exactly three coarse switches: Convites, Lembretes, Ranking', async () => {
    await renderScreen();

    expect(screen.getAllByRole('switch')).toHaveLength(3);

    // each switch is labelled by its category and defaults to on
    for (const label of ['Convites', 'Lembretes', 'Ranking']) {
      const sw = screen.getByLabelText(label);
      expect(sw).toBeTruthy();
      expect(sw.props.value).toBe(true);
    }
  });

  // ----------------------------------------------------------- toggle persists
  /**
   * Covers: S10 — Settings
   * Criterion: "toggling each persists via useNotificationPrefsStore." Each
   *  switch is wired to its setter; the store owns AsyncStorage persistence.
   */
  it('writes to the store setter when each switch is toggled off', async () => {
    await renderScreen();

    await act(async () => {
      fireEvent(screen.getByLabelText('Convites'), 'valueChange', false);
    });
    expect(mockSetInvites).toHaveBeenCalledWith(false);

    await act(async () => {
      fireEvent(screen.getByLabelText('Lembretes'), 'valueChange', false);
    });
    expect(mockSetReminders).toHaveBeenCalledWith(false);

    await act(async () => {
      fireEvent(screen.getByLabelText('Ranking'), 'valueChange', false);
    });
    expect(mockSetRanking).toHaveBeenCalledWith(false);
  });

  /**
   * Covers: S10 — Settings
   * Criterion: "the saved state is reflected after restart." A persisted (off)
   *  value is reflected by the switch on a fresh mount.
   */
  it('reflects persisted (off) values on mount', async () => {
    useNotificationPrefsStore.setState({ reminders: false });
    await renderScreen();

    expect(screen.getByLabelText('Convites').props.value).toBe(true);
    expect(screen.getByLabelText('Lembretes').props.value).toBe(false);
    expect(screen.getByLabelText('Ranking').props.value).toBe(true);
  });

  // ---------------------------------------------------------------- tab bar
  /**
   * Covers: S10 — Settings
   * Criterion: "No bottom tab bar on any of the three screens."
   */
  it('renders no bottom tab bar (no tab labels in the screen body)', async () => {
    await renderScreen();

    expect(screen.queryByText('Início')).toBeNull();
    expect(screen.queryByText('Explorar')).toBeNull();
    expect(screen.queryByText('Rede')).toBeNull();
    expect(screen.queryByText('Perfil')).toBeNull();
  });
});
