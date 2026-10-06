/**
 * S5 — Bottom tab bar + central "Jogar" FAB tests (app/(tabs)/_layout.tsx).
 *
 * Covers the two S5 acceptance criteria owned by the tab layout (not the Home
 * screen body):
 *  - "The bottom tab bar (4 tabs + central FAB) persists across navigation and
 *    Home is the active tab."
 *  - "Tapping 'Criar partida' navigates to S11; the central 'Jogar' FAB does the
 *    same." (the FAB half — the card-CTA half is in HomeScreen.test.tsx.)
 *
 * The `Tabs` navigator is mocked so its `tabBar` render prop is invoked with a
 * synthetic navigation state (Home = index 0, active), without a real navigation
 * container. Navigation is mocked via expo-router; the brand SVG icons + gradient
 * are stubbed inline.
 */
import React from 'react';

// --- Native / module mocks ------------------------------------------------

// LinearGradient -> View (the FAB fill).
jest.mock('expo-linear-gradient', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: any) =>
      ReactLocal.createElement(
        View,
        { ...props, testID: props.testID ?? 'linear-gradient' },
        children,
      ),
  };
});

// safe-area insets -> zero (no provider under test).
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Brand tab + FAB icons -> inert nodes carrying their focused state for assertion.
jest.mock('@/components/icons/JogarIcon', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return { JogarIcon: (props: any) => ReactLocal.createElement(View, { ...props, testID: 'icon-jogar' }) };
});
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

// RN Modal wraps children in an AppContainer that needs a native root tag the
// test renderer can't supply -> passthrough that renders children when visible.
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const ReactLocal = require('react');
  return {
    __esModule: true,
    default: ({ visible, children }: any) =>
      visible ? ReactLocal.createElement(ReactLocal.Fragment, null, children) : null,
  };
});

// lucide icons in the "BORA JOGAR?" menu -> inert nodes.
jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) =>
    ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  return { Plus: stub('plus'), Search: stub('search'), X: stub('x') };
});

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

import { fireEvent, render, screen } from '@testing-library/react-native';

import TabsLayout from '../../../../app/(tabs)/_layout';

beforeEach(() => {
  mockPush.mockClear();
  mockNavigate.mockClear();
  mockEmit.mockClear();
});

describe('S5 — Bottom tab bar + Jogar FAB', () => {
  /**
   * Covers: S5 — Home
   * Criterion: "The bottom tab bar (4 tabs + central FAB) persists ... and Home is
   *  the active tab." — all four labeled tabs plus the central FAB render.
   */
  it('renders the four labeled tabs and the central Jogar FAB', async () => {
    await render(<TabsLayout />);

    // The bar is icon-only (compact redesign) — tabs are identified by their
    // accessibility label, not visible text.
    expect(screen.getByLabelText('Início')).toBeTruthy();
    expect(screen.getByLabelText('Explorar')).toBeTruthy();
    expect(screen.getByLabelText('Rede')).toBeTruthy();
    expect(screen.getByLabelText('Perfil')).toBeTruthy();

    // central FAB present (accessible "Jogar" button + its icon)
    expect(screen.getByLabelText('Jogar')).toBeTruthy();
    expect(screen.getByTestId('icon-jogar')).toBeTruthy();
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
   * Covers: S5 — Home
   * Criterion: "... the central 'Jogar' FAB does the same [reaches S11
   *  /matches/create]." — the FAB now opens the "BORA JOGAR?" menu, and
   *  "Criar partida" within it pushes create-match.
   */
  it('opens the Jogar menu and pushes /matches/create via "Criar partida"', async () => {
    await render(<TabsLayout />);

    // Menu is closed initially — its options are not mounted.
    expect(screen.queryByLabelText('Criar partida')).toBeNull();

    // Tapping the FAB opens the menu instead of navigating directly.
    fireEvent.press(screen.getByLabelText('Jogar'));
    const createOption = await screen.findByLabelText('Criar partida');
    expect(screen.getByText('Bora jogar?')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.press(createOption);

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/matches/create');
  });

  /**
   * Covers: S5 — Home (Jogar menu)
   * "Buscar partida" within the menu pushes the explore/search flow.
   */
  it('pushes /explore via "Buscar partida" in the Jogar menu', async () => {
    await render(<TabsLayout />);

    fireEvent.press(screen.getByLabelText('Jogar'));
    fireEvent.press(await screen.findByLabelText('Buscar partida'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/explore');
  });

  /**
   * Covers: S5 — Home (tab-bar behavior)
   * Tapping a non-active tab navigates to that route (the bar drives navigation);
   * the FAB is NOT a tab route (it pushes, it doesn't navigate).
   */
  it('navigates to a tab route when a non-active tab is tapped', async () => {
    await render(<TabsLayout />);

    fireEvent.press(screen.getByLabelText('Explorar'));

    expect(mockNavigate).toHaveBeenCalledWith('explore');
    expect(mockPush).not.toHaveBeenCalled();
  });
});
