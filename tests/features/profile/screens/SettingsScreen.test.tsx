/**
 * S10 — Settings screen tests.
 *
 * Covers SCOPE S10 acceptance criteria:
 *  - Header "CONFIGURAÇÕES" + back affordance.
 *  - Profile summary card (avatar, name, @handle · position).
 *  - "Editar perfil" opens the edit form with all fields + position chips.
 *  - "Aparência" theme selector (Claro / Escuro / Automático).
 *  - "Notificações" coarse toggles (convites, lembretes, ranking).
 *  - "Permissões do app" opens OS settings.
 *  - "Enviar feedback" opens mailto link.
 *  - "Sobre o Quadra" shows version.
 *  - Logout clears auth and navigates to login.
 *  - "Pagamentos e Premium" is NOT rendered (Layer 3 OUT).
 */
import React from 'react';

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

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      ReactLocal.createElement(View, props, children),
  };
});

jest.mock('expo-image', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: any) => ReactLocal.createElement(View, props),
  };
});

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { version: '1.0.0' },
    nativeAppVersion: '1.0.0',
  },
}));

jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) =>
    ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  return {
    Bell: stub('bell'),
    Calendar: stub('calendar'),
    Check: stub('check'),
    ChevronLeft: stub('chevron-left'),
    ChevronRight: stub('chevron-right'),
    Flag: stub('flag'),
    Globe: stub('globe'),
    LogOut: stub('log-out'),
    Pencil: stub('pencil'),
    Shield: stub('shield'),
    Sun: stub('sun'),
    User: stub('user'),
  };
});

jest.mock('@/components/ui/Button', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID, disabled }: any) =>
      ReactLocal.createElement(
        Pressable,
        {
          onPress: disabled ? undefined : onPress,
          testID,
          accessibilityRole: 'button',
        },
        ReactLocal.createElement(Text, null, children),
      ),
  };
});

const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: (...args: unknown[]) => mockBack(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert, Linking } from 'react-native';

import SettingsScreen from '../../../../app/profile/settings';
import type { MyProfile } from '@/features/profile/types/profile';
import { logout } from '@/lib/auth/logout';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notifications';
import { useThemeStore } from '@/stores/theme';

const PROFILE_FIXTURE: MyProfile = {
  id: 'me',
  firstName: 'Renan',
  lastName: 'Dias',
  handle: 'renan',
  birthDate: '14/03/1998',
  phone: '11984721130',
  position: 'LEV',
  avatarUrl: 'https://example.com/avatar.jpg',
  overall: 68,
  level: 15,
  xp: 2450,
  xpToNext: 5000,
};

jest.mock('@/features/profile/api/getMyProfile', () => ({
  useMyProfile: () => ({
    data: PROFILE_FIXTURE,
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/features/profile/api/updateProfile', () => ({
  useUpdateProfile: () => ({
    mutate: jest.fn(),
    isPending: false,
    isError: false,
  }),
}));

jest.mock('@/lib/auth/logout', () => ({
  logout: jest.fn(() => Promise.resolve()),
}));

describe('SettingsScreen (S10)', () => {
  const mockOpenSettings = jest.fn(() => Promise.resolve());
  const mockOpenURL = jest.fn(() => Promise.resolve());

  async function renderScreen() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await act(async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <SettingsScreen />
        </QueryClientProvider>,
      );
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().clearAuth();
    useThemeStore.setState({ mode: 'light' });
    useNotificationStore.setState({
      convites: true,
      lembretes: true,
      ranking: true,
    });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(Linking, 'openSettings').mockImplementation(mockOpenSettings);
    jest.spyOn(Linking, 'openURL').mockImplementation(mockOpenURL);
  });

  it('renders the settings list with profile summary and sections', async () => {
    await renderScreen();

    expect(screen.getByText('Configurações')).toBeTruthy();
    expect(screen.getByText('Renan Dias')).toBeTruthy();
    expect(screen.getByText('@renan · Levantador')).toBeTruthy();
    expect(screen.getByText('Editar perfil')).toBeTruthy();
    expect(screen.getByText('Aparência')).toBeTruthy();
    expect(screen.getByText('Notificações')).toBeTruthy();
    expect(screen.getByText('Permissões do app')).toBeTruthy();
    expect(screen.getByText('Enviar feedback')).toBeTruthy();
    expect(screen.getByText('Sobre o Quadra')).toBeTruthy();
    expect(screen.getByText('Sair da conta')).toBeTruthy();
    expect(screen.queryByText('Pagamentos e Premium')).toBeNull();
  });

  it('navigates back from the list header', async () => {
    await renderScreen();
    fireEvent.press(screen.getByTestId('settings-back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('switches appearance theme mode', async () => {
    await renderScreen();
    fireEvent.press(screen.getByTestId('theme-dark'));
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('opens OS settings from permissions row', async () => {
    await renderScreen();
    fireEvent.press(screen.getByTestId('settings-permissions'));
    expect(mockOpenSettings).toHaveBeenCalled();
  });

  it('opens feedback mailto link', async () => {
    await renderScreen();
    fireEvent.press(screen.getByTestId('settings-feedback'));
    expect(mockOpenURL).toHaveBeenCalledWith(
      expect.stringContaining('mailto:feedback@quadra.app'),
    );
  });

  it('shows about alert with app version', async () => {
    await renderScreen();
    fireEvent.press(screen.getByTestId('settings-about'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Sobre o Quadra',
      expect.stringContaining('v1.0.0'),
    );
  });

  it('opens edit profile form with fields and position chips', async () => {
    await renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('settings-edit-profile'));
    });

    expect(screen.getByText('Editar perfil')).toBeTruthy();
    expect(screen.getByTestId('edit-first-name')).toBeTruthy();
    expect(screen.getByTestId('edit-last-name')).toBeTruthy();
    expect(screen.getByTestId('edit-handle')).toBeTruthy();
    expect(screen.getByTestId('edit-birth-date')).toBeTruthy();
    expect(screen.getByTestId('edit-phone')).toBeTruthy();
    expect(screen.getByTestId('edit-position-LEV')).toBeTruthy();
    expect(screen.getByText('Salvar alterações')).toBeTruthy();
    expect(screen.getByText('Trocar foto')).toBeTruthy();
  });

  it('opens notifications toggles screen', async () => {
    await renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('settings-notifications'));
    });

    expect(screen.getByTestId('notification-convites')).toBeTruthy();
    expect(screen.getByTestId('notification-lembretes')).toBeTruthy();
    expect(screen.getByTestId('notification-ranking')).toBeTruthy();
  });

  it('logs out after confirmation', async () => {
    await renderScreen();
    fireEvent.press(screen.getByTestId('settings-logout'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      expect.any(Array),
    );

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirm = buttons.find((b: { text: string }) => b.text === 'Sair');

    await act(async () => {
      confirm.onPress();
    });

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });
});
