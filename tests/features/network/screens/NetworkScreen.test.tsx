/**
 * S7 — Network (placeholder) screen tests.
 *
 * Covers every acceptance criterion in docs/specs/S7-network.md:
 *  - The "Rede" tab opens app/(tabs)/network.tsx and renders without errors.
 *  - Header shows "REDE" (uppercase, font-display/text-h1) + a notification bell
 *    (theme selection lives only in Settings).
 *  - The body shows the verbatim primary message "Em breve: rede social de
 *    jogadores".
 *  - No feed/posts, like/comment/share controls, friend-suggestion carousel, or
 *    CTAs/buttons are present.
 *  - The screen makes zero network requests (backend deps: none).
 *  - The placeholder message is announced to screen readers
 *    (accessibilityLiveRegion / accessible text).
 *
 * The bottom tab bar + "Rede" active tab are owned by app/(tabs)/_layout.tsx,
 * NOT this screen body — that interaction is covered by the TabsLayout tests
 * (tests/features/matches/screens/TabsLayout.test.tsx + ExploreTabActive.test.tsx),
 * so this file focuses purely on the screen's content.
 *
 * The screen is a pure static render — no query hooks, no router, no async work.
 * Native modules (safe-area, lucide) are stubbed inline, matching S5/S6 — the
 * repo's tests/__mocks__ are NOT auto-applied.
 */
import React from 'react';

// --- Native / module mocks ------------------------------------------------

// safe-area -> plain View (no insets provider needed under test).
jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      ReactLocal.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// lucide icons -> inert nodes (header bell/settings + placeholder Users icon).
jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) =>
    ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  return {
    Bell: stub('bell'),
    Settings: stub('settings'),
    Sun: stub('sun'),
    Users: stub('users'),
  };
});

// expo-router: spyable router.push (header settings affordance -> /profile/settings)
// + useFocusEffect (used by useRegisterNavBlurTarget) delegated to a plain effect.
const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const ReactLocal = require('react');
  return {
    router: {
      push: (...args: any[]) => mockPush(...args),
    },
    useFocusEffect: (cb: () => void | (() => void)) =>
      ReactLocal.useEffect(() => cb(), [cb]),
  };
});

import { fireEvent, render, screen } from '@testing-library/react-native';

import NetworkScreen from '../../../../app/(tabs)/network';

beforeEach(() => {
  mockPush.mockClear();
});

describe('S7 — Network (placeholder) screen', () => {
  // --------------------------------------------------------------- renders ok
  /**
   * Covers: S7 — Network
   * Criterion: "The 'Rede' tab opens app/(tabs)/network.tsx and renders without
   *  errors."
   */
  it('renders without throwing and shows its core chrome', async () => {
    await render(<NetworkScreen />);

    // Mounting produced the title + placeholder without errors.
    expect(screen.getByText('REDE')).toBeTruthy();
    expect(
      screen.getByText('Em breve: rede social de jogadores'),
    ).toBeTruthy();
  });

  // -------------------------------------------------------------------- header
  /**
   * Covers: S7 — Network
   * Criterion: "Header shows the title 'REDE' (uppercase, font-display/text-h1)
   *  plus a notification bell — theme selection lives only in Settings."
   */
  it('renders the REDE header with the bell and no theme toggle', async () => {
    await render(<NetworkScreen />);

    // Title is the verbatim uppercase brand display title.
    const title = screen.getByText('REDE');
    expect(title).toBeTruthy();
    // font-display + text-h1 + uppercase tokens applied via NativeWind className.
    expect(title.props.className).toContain('font-display');
    expect(title.props.className).toContain('text-h1');
    expect(title.props.className).toContain('uppercase');

    // bell is an accessible button (mirrors S5/S6).
    expect(screen.getByLabelText('Notificações')).toBeTruthy();
    // the bell icon renders
    expect(screen.getByTestId('icon-bell')).toBeTruthy();
    // theme toggle moved to Settings — not in the header.
    expect(screen.queryByLabelText('Alternar tema')).toBeNull();
    expect(screen.queryByTestId('icon-sun')).toBeNull();
    // settings affordance is present in every screen header.
    expect(screen.getByLabelText('Configurações')).toBeTruthy();
    expect(screen.getByTestId('icon-settings')).toBeTruthy();
  });

  // ------------------------------------------------------- placeholder message
  /**
   * Covers: S7 — Network
   * Criterion: "The body shows the message 'Em breve: rede social de jogadores'
   *  (verbatim) as the primary text."
   */
  it('shows the verbatim primary placeholder message', async () => {
    await render(<NetworkScreen />);

    expect(
      screen.getByText('Em breve: rede social de jogadores'),
    ).toBeTruthy();
  });

  // ---------------------------------------------------------------- a11y
  /**
   * Covers: S7 — Network
   * Criterion: "The placeholder message is announced to screen readers
   *  (accessibilityLiveRegion / accessible text)."
   *
   * The placeholder text is plain accessible Text, and its container declares
   * accessibilityLiveRegion="polite" so the message is announced.
   */
  it('announces the placeholder via an accessibilityLiveRegion container', async () => {
    await render(<NetworkScreen />);

    const message = screen.getByText('Em breve: rede social de jogadores');

    // Walk up to find an ancestor declaring a polite live region.
    let node: any = message;
    let liveRegion: string | undefined;
    while (node) {
      if (node.props?.accessibilityLiveRegion) {
        liveRegion = node.props.accessibilityLiveRegion;
        break;
      }
      node = node.parent;
    }
    expect(liveRegion).toBe('polite');

    // The message itself is reachable by a screen reader (Text is accessible by
    // default; it is not hidden from assistive tech).
    expect(message.props.accessibilityElementsHidden).toBeFalsy();
    expect(message.props.importantForAccessibility).not.toBe('no');
  });

  // ----------------------------------------------- exclusions (SCOPE S7 OUT)
  /**
   * Covers: S7 — Network
   * Criterion: "No feed, posts, like/comment/share controls, friend-suggestion
   *  carousel, or CTAs/buttons are present."
   *
   * The only buttons allowed are the header bell + settings affordance (both
   * header chrome). There is NO content button/CTA in the body.
   */
  it('renders no feed, posts, social actions, friend carousel, or content CTAs', async () => {
    await render(<NetworkScreen />);

    // No social-feed copy or controls.
    expect(screen.queryByText(/curtir/i)).toBeNull();
    expect(screen.queryByText(/coment/i)).toBeNull();
    expect(screen.queryByText(/compartilh/i)).toBeNull();
    expect(screen.queryByText(/participar/i)).toBeNull();
    expect(screen.queryByText(/sugest[ãa]o de amigos/i)).toBeNull();
    expect(screen.queryByText(/ver tudo/i)).toBeNull();
    expect(screen.queryByText(/explorar/i)).toBeNull();

    // No feed/post/carousel scaffolding test IDs.
    expect(screen.queryByTestId('feed')).toBeNull();
    expect(screen.queryByTestId('posts')).toBeNull();
    expect(screen.queryByTestId('friend-suggestions')).toBeNull();

    // The only accessible buttons are the header chrome (bell + settings) —
    // nothing in the body.
    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(2);
    const labels = buttons.map((b) => b.props.accessibilityLabel).sort();
    expect(labels).toEqual(['Configurações', 'Notificações']);
  });

  /**
   * Covers: S7 — Network
   * Criterion: the bell is a no-op on this placeholder (consistent with S5/S6) —
   *  tapping it does nothing observable / throws nothing.
   */
  it('keeps the bell as a no-op (tapping is harmless)', async () => {
    await render(<NetworkScreen />);

    expect(() => {
      fireEvent.press(screen.getByLabelText('Notificações'));
    }).not.toThrow();

    // Still on the placeholder afterwards — nothing changed.
    expect(
      screen.getByText('Em breve: rede social de jogadores'),
    ).toBeTruthy();
  });

  /**
   * Covers: S7 — Network
   * Criterion: the settings affordance is present on every screen header and
   *  navigates to S10 (/profile/settings).
   */
  it('navigates to /profile/settings when the settings icon is tapped', async () => {
    await render(<NetworkScreen />);

    fireEvent.press(screen.getByLabelText('Configurações'));

    expect(mockPush).toHaveBeenCalledWith('/profile/settings');
  });

  // ------------------------------------------------------- zero network calls
  /**
   * Covers: S7 — Network
   * Criterion: "The screen makes zero network requests (backend deps: none)."
   *
   * Spy on global.fetch (the transport TanStack Query / the API client use) and
   * assert it is never called while the screen mounts and re-renders.
   */
  it('makes zero network requests on mount', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch' as never);

    const { rerender } = await render(<NetworkScreen />);
    rerender(<NetworkScreen />);

    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
