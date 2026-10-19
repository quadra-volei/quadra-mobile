/**
 * S10 — Settings list screen tests (`app/profile/settings.tsx`).
 *
 * Covers the list-screen acceptance criteria of docs/specs/S10-settings.md:
 *  - List header shows a back affordance + the "CONFIGURAÇÕES" display title
 *    (uppercase, font-display).
 *  - Summary card shows the authenticated user's avatar, full name, and
 *    "@handle · position".
 *  - The "CONTA" section shows "Editar perfil", "Exportar meus dados" and "Excluir conta"
 *    (no "Pagamentos e Premium"); deleting asks for confirmation first.
 *  - "Editar perfil" navigates to /profile/edit.
 *  - "Aparência" offers Claro / Escuro / Automático, the selected option is
 *    visually marked, the choice persists via useThemeStore, and dark/system show
 *    an "Em breve" affordance.
 *  - "Notificações" is a chevron row that navigates to /profile/notifications.
 *  - "Permissões do app" opens OS settings (Linking.openSettings).
 *  - "Enviar feedback" navigates to the in-app feedback screen (/profile/feedback).
 *  - "Sobre o Quadra vX.Y.Z" shows the app version.
 *  - "Sair da conta" (red) calls logout(queryClient) (clears tokens + auth store +
 *    query cache and redirects to Login).
 *  - No bottom tab bar on the screen (it is a stack screen outside (tabs)).
 *
 * The profile read hook is mocked at the boundary. Navigation + Linking + the
 * logout helper are mocked. The theme store is mocked at the boundary with a
 * synchronous, stateful stub (its real AsyncStorage persistence is covered by the
 * dedicated store unit test, tests/features/profile/stores/theme.test.ts) — this
 * keeps the screen test deterministic and free of async rehydration. Native
 * modules (safe-area, expo-image, lucide, Button) are stubbed inline — the repo's
 * tests/__mocks__ are NOT auto-applied.
 */
import React from 'react';

// --- Native / module mocks ------------------------------------------------

// The screen reads the QueryClient (to pass into logout) via useQueryClient; the
// read hook itself is mocked at the boundary, so a bare client stub is enough.
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({}),
}));

// Theme store mocked at the boundary: a synchronous, stateful stub exposing the
// hook (selector form), getState and setState — no AsyncStorage, no async
// rehydration. The real store's persistence is unit-tested separately.
const mockThemeStore: { theme: 'light' | 'dark' | 'system' } = { theme: 'light' };
const mockSetTheme = jest.fn((theme: 'light' | 'dark' | 'system') => {
  mockThemeStore.theme = theme;
});
jest.mock('@/stores/theme', () => {
  const useThemeStore: any = (selector: any) =>
    selector({ theme: mockThemeStore.theme, setTheme: mockSetTheme });
  useThemeStore.getState = () => ({
    theme: mockThemeStore.theme,
    setTheme: mockSetTheme,
  });
  useThemeStore.setState = (partial: any) => {
    Object.assign(
      mockThemeStore,
      typeof partial === 'function' ? partial(mockThemeStore) : partial,
    );
  };
  return { useThemeStore };
});

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      ReactLocal.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('expo-image', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: any) => ReactLocal.createElement(View, props),
  };
});

jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) =>
    ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  return {
    Bell: stub('bell'),
    Check: stub('check'),
    ChevronLeft: stub('chevron-left'),
    ChevronRight: stub('chevron-right'),
    Download: stub('download'),
    FileText: stub('file-text'),
    Globe: stub('globe'),
    MapPin: stub('map-pin'),
    MessageSquare: stub('message-square'),
    Shield: stub('shield'),
    Trash2: stub('trash'),
    User: stub('user'),
    UserX: stub('user-x'),
    Users: stub('users'),
  };
});

// Button is a NativeWind (css-interop) Pressable; pressing the real one schedules
// an async interaction-state update that escapes fireEvent's sync act(). Stub it
// as a plain Pressable — its internals are covered by its own tests.
jest.mock('@/components/ui/Button', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID }: any) =>
      ReactLocal.createElement(
        Pressable,
        { onPress, testID, accessibilityRole: 'button' },
        ReactLocal.createElement(Text, null, children),
      ),
  };
});

// expo-router: spyable router.push + router.back.
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...args: any[]) => mockPush(...args),
    back: (...args: any[]) => mockBack(...args),
  },
}));

// Linking (OS settings + mailto) — spied on the real react-native export in
// beforeEach (mocking the internal Libraries/Linking path leaves the public
// `Linking` export undefined under jest-expo).
const mockOpenSettings = jest.fn();
const mockOpenURL = jest.fn();

// logout helper (asserted as a single source of truth — its internals are covered
// by tests/features/profile/lib/logout.test.ts).
const mockLogout = jest.fn();
jest.mock('@/lib/auth/logout', () => ({
  logout: (...args: any[]) => mockLogout(...args),
}));

// --- Read hook mock (mocked at the boundary) ------------------------------
import type { MyProfile } from '@/features/profile/types/profile';

const PROFILE_FIXTURE: MyProfile = {
  id: 'me',
  firstName: 'Renan',
  avatarUrl: 'https://example.com/me.png',
  overall: 68,
  ace: 30,
  blk: 25,
  ata: 20,
  def: 30,
  srv: 27,
  rec: 24,
  level: 15,
  xp: 2450,
  xpToNext: 5000,
  record: { matches: 0, wins: 0, losses: 0, draws: 0, mvps: 0 },
  points: 0,
  cardStyle: { finish: 'Prisma', title: null, photoObjectKey: null },
  lastName: 'Dias',
  handle: 'renan',
  birthDate: '14/03/1998',
  phone: '11984721130',
  position: 'LEV',
};

const mockProfile: {
  data: MyProfile | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: jest.Mock;
} = {
  data: PROFILE_FIXTURE,
  isPending: false,
  isError: false,
  refetch: jest.fn(),
};

// "Mostrar minhas atividades" switch: the mutation is mocked at the hook boundary.
const mockSetSharing = jest.fn();
jest.mock('@/features/activity/api/activityApi', () => ({
  useSetActivitySharing: () => ({ mutate: mockSetSharing, isPending: false, variables: undefined }),
}));

// Account export / deletion: the mutations are mocked at the hook boundary.
const mockExport = jest.fn();
const mockDelete = jest.fn();
jest.mock('@/features/auth/api/account', () => ({
  useExportAccount: () => ({ mutate: mockExport, isPending: false }),
  useDeleteAccount: () => ({ mutate: mockDelete, isPending: false }),
}));

jest.mock('@/features/profile/api/getMyProfile', () => ({
  useMyProfile: () => ({
    data: mockProfile.data,
    isPending: mockProfile.isPending,
    isError: mockProfile.isError,
    refetch: mockProfile.refetch,
  }),
}));

import { Linking } from 'react-native';

import { dialog } from '@/components/ui/Dialog';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import { useThemeStore } from '@/stores/theme';

import SettingsScreen from '../../../../app/profile/settings';

// React 19 + RNTL: bind `screen` to the committed tree by flushing inside act.
async function renderScreen() {
  await act(async () => {
    render(<SettingsScreen />);
  });
}

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  mockOpenSettings.mockClear();
  mockOpenURL.mockClear();
  // Route the real Linking export at our spies (restored each test by setup.ts).
  jest.spyOn(Linking, 'openSettings').mockImplementation(mockOpenSettings);
  jest.spyOn(Linking, 'openURL').mockImplementation(mockOpenURL);
  mockLogout.mockClear();
  mockExport.mockClear();
  mockDelete.mockClear();
  mockSetTheme.mockClear();
  mockProfile.data = PROFILE_FIXTURE;
  mockProfile.isPending = false;
  mockProfile.isError = false;
  mockProfile.refetch.mockClear();
  // Reset the (mocked) theme store to the default before each test.
  useThemeStore.setState({ theme: 'light' });
});

afterEach(() => {
  cleanup();
});

describe('S10 — Settings list screen', () => {
  // -------------------------------------------------------------------- header
  /**
   * Covers: S10 — Settings
   * Criterion: "List header shows a back affordance and the 'CONFIGURAÇÕES'
   *  display title (uppercase, font-display)."
   */
  it('renders the header with a back affordance and the CONFIGURAÇÕES display title', async () => {
    await renderScreen();

    const back = screen.getByLabelText('Voltar');
    expect(back).toBeTruthy();
    fireEvent.press(back);
    expect(mockBack).toHaveBeenCalledTimes(1);

    const title = screen.getByText('Configurações');
    expect(title.props.className).toContain('font-display');
    expect(title.props.className).toContain('uppercase');
  });

  // ------------------------------------------------------------- summary card
  /**
   * Covers: S10 — Settings
   * Criterion: "Summary card shows the authenticated user's avatar, full name,
   *  and '@handle · position'."
   */
  it('renders the summary card with avatar, full name and "@handle · position"', async () => {
    await renderScreen();

    expect(screen.getByLabelText('Avatar de Renan')).toBeTruthy();
    expect(screen.getByText('Renan Dias')).toBeTruthy();
    expect(screen.getByText('@renan · Levantador')).toBeTruthy();
  });

  /**
   * Covers: S10 — Settings (Loading / error states)
   * Criterion: the summary card shows a skeleton while the profile is pending and
   *  the static rows still render.
   */
  it('shows a skeleton summary while the profile is pending without the name', async () => {
    mockProfile.isPending = true;
    mockProfile.data = undefined;
    await renderScreen();

    expect(screen.queryByText('Renan Dias')).toBeNull();
    // static rows still render
    expect(screen.getByText('Editar perfil')).toBeTruthy();
    expect(screen.getByText('Exportar meus dados')).toBeTruthy();
    expect(screen.getByText('Excluir conta')).toBeTruthy();
  });

  /**
   * Covers: S10 — Settings (Loading / error states)
   * Criterion: on profile error the summary card shows the retry affordance and
   *  calls refetch; the static rows still render.
   */
  it('shows the summary error/retry row and refetches on retry', async () => {
    mockProfile.isError = true;
    mockProfile.data = undefined;
    await renderScreen();

    expect(screen.getByText('Não foi possível carregar')).toBeTruthy();
    fireEvent.press(screen.getByText('Tentar novamente'));
    expect(mockProfile.refetch).toHaveBeenCalledTimes(1);
  });

  // ------------------------------------------------------------- CONTA section
  /**
   * Covers: S10 — Settings
   * Criterion: "The 'CONTA' section shows only 'Editar perfil' (no 'Pagamentos e
   *  Premium' row)."
   */
  it('shows the account rows under CONTA — no "Pagamentos e Premium"', async () => {
    await renderScreen();

    expect(screen.getByText('Editar perfil')).toBeTruthy();
    expect(screen.getByText('Exportar meus dados')).toBeTruthy();
    expect(screen.getByText('Excluir conta')).toBeTruthy();
    expect(screen.queryByText(/pagamentos/i)).toBeNull();
    expect(screen.queryByText(/premium/i)).toBeNull();
    expect(screen.queryByText('PRO')).toBeNull();
  });

  /**
   * Covers: S10 — Settings
   * Criterion: "'Editar perfil' navigates to /profile/edit."
   */
  it('navigates to /profile/edit when "Editar perfil" is tapped', async () => {
    await renderScreen();

    fireEvent.press(screen.getByText('Editar perfil'));
    expect(mockPush).toHaveBeenCalledWith('/profile/edit');
  });

  // ----------------------------------------------------------- Aparência tiles
  /**
   * Covers: S10 — Settings
   * Criterion: "'Aparência' offers Claro / Escuro / Automático; the selected
   *  option is visually marked; 'Escuro'/'Automático' show an 'Em breve'
   *  affordance."
   */
  it('renders the three appearance tiles with the selected mark and "Em breve" badges', async () => {
    await renderScreen();

    expect(screen.getByText('Aparência')).toBeTruthy();
    expect(screen.getByLabelText('Claro')).toBeTruthy();
    expect(screen.getByLabelText('Escuro')).toBeTruthy();
    expect(screen.getByLabelText('Automático')).toBeTruthy();

    // default 'light' selected, others not
    expect(screen.getByLabelText('Claro').props.accessibilityState?.selected).toBe(
      true,
    );
    expect(
      screen.getByLabelText('Escuro').props.accessibilityState?.selected,
    ).toBe(false);
    expect(
      screen.getByLabelText('Automático').props.accessibilityState?.selected,
    ).toBe(false);

    // dark + system carry an "Em breve" affordance (two badges)
    expect(screen.getAllByText('Em breve')).toHaveLength(2);
  });

  /**
   * Covers: S10 — Settings
   * Criterion: "the choice persists via useThemeStore ... across app restarts."
   *  Tapping a tile writes the choice to the store (the store owns AsyncStorage
   *  persistence — verified in tests/features/profile/stores/theme.test.ts).
   */
  it('writes the chosen appearance to the theme store when a tile is tapped', async () => {
    await renderScreen();

    fireEvent.press(screen.getByLabelText('Escuro'));

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  /**
   * Covers: S10 — Settings
   * Criterion: a persisted (rehydrated) appearance is reflected as the selected
   *  tile on a fresh mount.
   */
  it('reflects the persisted appearance as the selected tile on mount', async () => {
    useThemeStore.setState({ theme: 'dark' });
    await renderScreen();

    expect(
      screen.getByLabelText('Escuro').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByLabelText('Claro').props.accessibilityState?.selected,
    ).toBe(false);
  });

  // ----------------------------------------------------- Notificações chevron
  /**
   * Covers: S10 — Settings
   * Criterion: "'Notificações' is a chevron row that navigates to
   *  /profile/notifications."
   */
  it('navigates to /profile/notifications when the Notificações row is tapped', async () => {
    await renderScreen();

    fireEvent.press(screen.getByText('Notificações'));
    expect(mockPush).toHaveBeenCalledWith('/profile/notifications');
  });

  // --------------------------------------------------------- Permissões do app
  /**
   * Covers: S10 — Settings
   * Criterion: "'Permissões do app' opens OS settings."
   */
  it('opens OS settings when "Permissões do app" is tapped', async () => {
    await renderScreen();

    fireEvent.press(screen.getByText('Permissões do app'));
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------- Enviar feedback
  /**
   * Covers: S10 — Settings
   * Criterion: "'Enviar feedback' navigates to the in-app feedback screen
   *  (/profile/feedback)" — replaces the previous `mailto:` hand-off.
   */
  it('navigates to /profile/feedback when "Enviar feedback" is tapped', async () => {
    await renderScreen();

    fireEvent.press(screen.getByText('Enviar feedback'));
    expect(mockPush).toHaveBeenCalledWith('/profile/feedback');
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------- Sobre o Quadra
  /**
   * Covers: S10 — Settings
   * Criterion: "'Sobre o Quadra vX.Y.Z' shows the app version."
   */
  it('shows the app version on "Sobre o Quadra"', async () => {
    await renderScreen();

    expect(screen.getByText('Sobre o Quadra')).toBeTruthy();
    expect(screen.getByText(/^v\d+\.\d+\.\d+$/)).toBeTruthy();
  });

  // ---------------------------------------------------------- Sair da conta
  /**
   * Covers: S10 — Settings
   * Criterion: "'Sair da conta' (red) clears tokens + auth store + query cache and
   *  redirects to Login." The screen delegates to the single-source logout()
   *  helper (its clearing/redirect behaviour is verified in the helper's own test).
   */
  it('calls the logout helper when "Sair da conta" is tapped', async () => {
    await renderScreen();

    const logoutRow = screen.getByLabelText(/sair da conta/i);
    const label = screen.getByText('Sair da conta');
    // red destructive text
    expect(label.props.className).toContain('text-danger');

    fireEvent.press(logoutRow);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------- tab bar
  /**
   * Covers: S10 — Settings
   * Criterion: "No bottom tab bar on the screen." It is a stack screen outside
   *  (tabs); the four tab labels never render in its body.
   */
  it('renders no bottom tab bar (no tab labels in the screen body)', async () => {
    await renderScreen();

    expect(screen.queryByText('Início')).toBeNull();
    expect(screen.queryByText('Explorar')).toBeNull();
    expect(screen.queryByText('Rede')).toBeNull();
    expect(screen.queryByText('Perfil')).toBeNull();
  });

  it('shows the activity-sharing switch from the profile and saves a change', async () => {
    mockProfile.data = { ...PROFILE_FIXTURE, shareActivity: true };
    await renderScreen();

    const toggle = screen.getByTestId('activity-sharing-switch');
    expect(screen.getByText('Mostrar minhas atividades')).toBeTruthy();
    expect(toggle.props.value).toBe(true);

    fireEvent(toggle, 'valueChange', false);
    expect(mockSetSharing).toHaveBeenCalledWith(false);
  });

  it('exports the account data when "Exportar meus dados" is tapped', async () => {
    await renderScreen();

    fireEvent.press(screen.getByText('Exportar meus dados'));
    expect(mockExport).toHaveBeenCalledTimes(1);
  });

  it('asks for confirmation before deleting the account', async () => {
    const alert = jest.spyOn(dialog, 'alert').mockImplementation(() => {});
    await renderScreen();

    fireEvent.press(screen.getByText('Excluir conta'));
    expect(mockDelete).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledTimes(1);

    const buttons = alert.mock.calls[0]?.[2] ?? [];
    buttons.find((b) => b.style === 'destructive')?.onPress?.();
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('opens the blocked players list from Privacidade', async () => {
    await renderScreen();

    fireEvent.press(screen.getByText('Jogadores bloqueados'));
    expect(mockPush).toHaveBeenCalledWith('/profile/blocked');
  });

  it('opens the Terms and the Privacy Policy pages', async () => {
    await renderScreen();

    fireEvent.press(screen.getByText('Termos de Uso'));
    expect(mockOpenURL).toHaveBeenCalledWith('https://quadra-volei.app/termos');
    fireEvent.press(screen.getByText('Política de Privacidade'));
    expect(mockOpenURL).toHaveBeenCalledWith('https://quadra-volei.app/privacidade');
  });
});
