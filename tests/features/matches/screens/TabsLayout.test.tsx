/**
 * S5 — Bottom tab bar tests (app/(tabs)/_layout.tsx).
 *
 * Covers what the tab layout owns (not the Home screen body): the four tabs
 * persist across navigation with Home active, and the bar has no central
 * button (DECISIONS #88; "Criar partida" lives in the Home hero, covered in
 * HomeScreen.test.tsx).
 *
 * The `Tabs` navigator is mocked so its `tabBar` render prop is invoked with a
 * synthetic navigation state (Home = index 0, active), without a real navigation
 * container. Navigation is mocked via expo-router; the brand SVG icons are
 * stubbed inline.
 */
import React from 'react';

// --- Native / module mocks ------------------------------------------------

// The location gate (own test: LocationGate.test.tsx) -> passthrough.
jest.mock('@/components/domain/LocationGate',() => ({
  LocationGate: ({ children }: any) => children,
}));

// safe-area insets -> zero (no provider under test).
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Brand tab icons -> inert nodes carrying their focused state for assertion.
const tabIconStub = (id: string) => (props: any) => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return ReactLocal.createElement(View, {
    ...props,
    testID: `tab-icon-${id}${props.focused ? '-active' : ''}`,
  });
};
jest.mock('@/components/icons/TabHomeIcon', () => ({ TabHomeIcon: tabIconStub('home') }));
jest.mock('@/components/icons/TabExploreIcon', () => ({ TabExploreIcon: tabIconStub('explore') }));
jest.mock('@/components/icons/TabNetworkIcon', () => ({ TabNetworkIcon: tabIconStub('network') }));
jest.mock('@/components/icons/TabProfileIcon', () => ({ TabProfileIcon: tabIconStub('profile') }));

// Signed-in profile for the "Perfil" tab avatar; no photo by default.
let mockProfile: { avatarUrl?: string; firstName: string } | undefined;
jest.mock('@/features/profile/api/getMyProfile', () => ({
  useMyProfile: () => ({ data: mockProfile }),
}));

// expo-router: spyable router.push + a `Tabs` that renders only the `tabBar` prop
// against a synthetic navigation state (Home active).
const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockEmit = jest.fn(() => ({ defaultPrevented: false }));

jest.mock('expo-router', () => {
  const ReactLocal = require('react');
  const SYNTHETIC_STATE = {
    index: 0, // Home (index) is the active tab
    routes: [
      { name: 'index', key: 'index-key' },
      { name: 'explore', key: 'explore-key' },
      { name: 'network', key: 'network-key' },
      { name: 'profile', key: 'profile-key' },
    ],
  };
  const Tabs = ({ tabBar }: any) => {
    if (typeof tabBar !== 'function') return null;
    return tabBar({
      state: SYNTHETIC_STATE,
      navigation: { emit: mockEmit, navigate: mockNavigate },
    });
  };
  Tabs.Screen = () => null;
  return {
    router: { push: (...args: any[]) => mockPush(...args) },
    Tabs,
  };
});

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

import TabsLayout from '../../../../app/(tabs)/_layout';

beforeEach(() => {
  mockProfile = undefined;
  mockPush.mockClear();
  mockNavigate.mockClear();
  mockEmit.mockClear();
});

describe('S5 — Bottom tab bar', () => {
  /**
   * Covers: S5 — Home
   * Criterion: "The bottom tab bar persists ... and Home is the active tab." —
   *  the four tabs render and there is no central button (DECISIONS #88).
   */
  it('renders the four tabs and no central button', async () => {
    await render(<TabsLayout />);

    // The bar is icon-only (compact redesign) — tabs are identified by their
    // accessibility label, not visible text.
    expect(screen.getByLabelText('Início')).toBeTruthy();
    expect(screen.getByLabelText('Explorar')).toBeTruthy();
    expect(screen.getByLabelText('Rede')).toBeTruthy();
    expect(screen.getByLabelText('Perfil')).toBeTruthy();

    expect(screen.queryByLabelText('Jogar')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  /**
   * Covers: S5 — Home
   * Criterion: "... Home is the active tab." — only the Home tab is focused/selected.
   */
  it('marks the Home tab as the active/selected tab', async () => {
    await render(<TabsLayout />);

    // Home tab button announces selected; the others do not.
    expect(
      screen.getByLabelText('Início').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByLabelText('Explorar').props.accessibilityState?.selected,
    ).toBe(false);

    // Home icon renders in its focused/active variant; others inactive.
    expect(screen.getByTestId('tab-icon-home-active')).toBeTruthy();
    expect(screen.getByTestId('tab-icon-explore')).toBeTruthy();
  });

  /**
   * The floating bar hides while the keyboard is open (it would otherwise ride
   * on top of the keyboard on Android) and comes back when it closes.
   */
  it('hides the bar while the keyboard is open', async () => {
    const listeners: Record<string, () => void> = {};
    const spy = jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation(((event: string, cb: () => void) => {
        listeners[event] = cb;
        return { remove: jest.fn() };
      }) as never);

    await render(<TabsLayout />);
    expect(screen.getByLabelText('Início')).toBeTruthy();

    await act(async () => listeners.keyboardDidShow?.());
    expect(screen.queryByLabelText('Início')).toBeNull();

    await act(async () => listeners.keyboardDidHide?.());
    expect(screen.getByLabelText('Início')).toBeTruthy();

    spy.mockRestore();
  });

  /**
   * Covers: S5 — Home (tab-bar behavior)
   * Tapping a non-active tab navigates to that route (the bar drives navigation).
   */
  it('navigates to a tab route when a non-active tab is tapped', async () => {
    await render(<TabsLayout />);

    fireEvent.press(screen.getByLabelText('Explorar'));

    expect(mockNavigate).toHaveBeenCalledWith('explore');
    expect(mockPush).not.toHaveBeenCalled();
  });

  /**
   * "Perfil" shows the user's photo in a small circle (Instagram-style); with
   * no photo it falls back to the regular profile icon.
   */
  it('shows the profile photo on the Perfil tab, or the icon without one', async () => {
    await render(<TabsLayout />);
    expect(screen.getByTestId('tab-icon-profile')).toBeTruthy();
    expect(screen.queryByTestId('tab-profile-avatar')).toBeNull();

    mockProfile = { avatarUrl: 'https://cdn.example/me.jpg', firstName: 'Ana' };
    await render(<TabsLayout />);
    expect(screen.getByTestId('tab-profile-avatar')).toBeTruthy();
    expect(screen.getByLabelText('Avatar de Ana')).toBeTruthy();
    expect(screen.queryByTestId('tab-icon-profile')).toBeNull();
  });
});
