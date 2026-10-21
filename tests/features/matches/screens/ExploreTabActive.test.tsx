/**
 * S6 — Bottom tab bar persists with "Explorar" as the active tab
 * (app/(tabs)/_layout.tsx).
 *
 * Covers the S6 acceptance criterion owned by the tab layout (not the Explore
 * screen body):
 *  - "The bottom tab bar persists and 'Explorar' is the active tab."
 *
 * The `Tabs` navigator is mocked so its `tabBar` render prop is invoked with a
 * synthetic navigation state in which Explore (index 1) is active — mirroring the
 * S5 TabsLayout test but focusing the active tab on Explore. Navigation is mocked
 * via expo-router; the brand SVG icons are stubbed inline.
 */
import React from 'react';

// --- Native / module mocks ------------------------------------------------

// The location gate (own test: LocationGate.test.tsx) -> passthrough.
jest.mock('@/components/domain/LocationGate',() => ({
  LocationGate: ({ children }: any) => children,
}));

// Blur (native) and the "+" icon -> plain Views.
jest.mock('expo-blur', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const Plain = ReactLocal.forwardRef((props: any, ref: any) =>
    ReactLocal.createElement(View, { ...props, ref }),
  );
  return { BlurView: Plain, BlurTargetView: Plain };
});
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const ReactLocal = require('react');
  return { Plus: (props: any) => ReactLocal.createElement(View, props) };
});

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

// The Perfil tab reads the signed-in profile; no photo -> regular icon.
jest.mock('@/features/profile/api/getMyProfile', () => ({
  useMyProfile: () => ({ data: undefined }),
}));

// expo-router: a `Tabs` that renders only the `tabBar` prop against a synthetic
// navigation state where Explore (index 1) is active.
const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockEmit = jest.fn(() => ({ defaultPrevented: false }));

jest.mock('expo-router', () => {
  const SYNTHETIC_STATE = {
    index: 1, // Explore is the active tab
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

import { render, screen } from '@testing-library/react-native';

import TabsLayout from '../../../../app/(tabs)/_layout';
import { useAuthStore } from '@/stores/auth';

beforeEach(() => {
  // The tabs only open for a signed-in account with a profile.
  useAuthStore.getState().setAuth({ userId: 'u1', accessToken: 'tok', hasProfile: true });
  mockPush.mockClear();
  mockNavigate.mockClear();
  mockEmit.mockClear();
});

describe('S6 — Bottom tab bar with Explorar active', () => {
  /**
   * Covers: S6 — Explore
   * Criterion: "The bottom tab bar persists ..." — the four tabs render.
   */
  it('renders the four tabs', async () => {
    await render(<TabsLayout />);

    // Icon-only bar (compact redesign) — tabs are identified by accessibility
    // label, not visible text.
    expect(screen.getByLabelText('Início')).toBeTruthy();
    expect(screen.getByLabelText('Explorar')).toBeTruthy();
    expect(screen.getByLabelText('Rede')).toBeTruthy();
    expect(screen.getByLabelText('Perfil')).toBeTruthy();
  });

  /**
   * Covers: S6 — Explore
   * Criterion: "... 'Explorar' is the active tab." — only the Explore tab is
   *  focused/selected; the others are not.
   */
  it('marks the Explorar tab as the active/selected tab', async () => {
    await render(<TabsLayout />);

    expect(
      screen.getByLabelText('Explorar').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByLabelText('Início').props.accessibilityState?.selected,
    ).toBe(false);

    // Explore icon renders in its focused/active variant; Home inactive.
    expect(screen.getByTestId('tab-icon-explore-active')).toBeTruthy();
    expect(screen.getByTestId('tab-icon-home')).toBeTruthy();
  });
});
