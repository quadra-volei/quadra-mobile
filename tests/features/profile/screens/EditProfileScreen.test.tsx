/**
 * S10 — Edit-profile screen tests (`app/profile/edit.tsx`).
 *
 * Covers the edit-screen acceptance criteria of docs/specs/S10-settings.md:
 *  - The edit form is pre-filled from useMyProfile and exposes NOME, SOBRENOME,
 *    APELIDO (@), DATA DE NASCIMENTO, NÚMERO DE TELEFONE, and a single-select
 *    POSIÇÃO EM QUADRA chip group.
 *  - Edit form validates via React Hook Form + Zod (invalid @handle / empty name /
 *    invalid date surface inline errors).
 *  - "Salvar alterações" is a primary CTA, calls useUpdateProfile, shows a loading
 *    state, and returns to the list (router.back) on success.
 *  - "Trocar foto" launches the image library picker; after picking, the avatar
 *    preview updates to the chosen local URI and that URI is in the
 *    useUpdateProfile payload. Media-library permission is requested before
 *    launching; denial is handled gracefully (no crash).
 *  - No bottom tab bar; back returns to the previous screen.
 *
 * The profile read + update hooks are mocked at the boundary; expo-image-picker is
 * mocked so the permission/pick branches are deterministic. The Zod resolver runs
 * for real (the validation criterion is the contract). Native modules (reanimated,
 * safe-area, expo-image, lucide, Button) are stubbed inline — the repo's
 * tests/__mocks__ are NOT auto-applied. The TextField/DateField/PhoneInput/
 * FilterChip primitives render for real (queried by testID).
 */
import React from 'react';

// --- Native / module mocks ------------------------------------------------

jest.mock('react-native-reanimated', () => {
  const ReactLocal = require('react');
  const { ScrollView, View } = require('react-native');
  const AnimatedScrollView = ({ children, style, ...props }: any) =>
    ReactLocal.createElement(ScrollView, { ...props, style }, children);
  const AnimatedView = ({ children, style, ...props }: any) =>
    ReactLocal.createElement(View, { ...props, style }, children);
  return {
    __esModule: true,
    default: { ScrollView: AnimatedScrollView, View: AnimatedView },
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    useAnimatedStyle: (cb: () => object) => cb(),
  };
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
    ChevronLeft: stub('chevron-left'),
    Pencil: stub('pencil'),
    Calendar: stub('calendar'),
  };
});

// Button is a NativeWind (css-interop) Pressable. Stub it as a plain Pressable
// that forwards loading -> accessibilityState.busy/disabled so the CTA loading
// criterion stays queryable. Its internals are covered by its own tests.
jest.mock('@/components/ui/Button', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID, loading }: any) =>
      ReactLocal.createElement(
        Pressable,
        {
          onPress,
          testID,
          accessibilityRole: 'button',
          accessibilityState: { busy: Boolean(loading), disabled: Boolean(loading) },
        },
        ReactLocal.createElement(Text, null, children),
      ),
  };
});

// expo-router: spyable router.back.
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: (...args: any[]) => mockBack(...args),
  },
}));

// expo-image-picker: drive permission + pick branches deterministically.
const mockRequestPermission = jest.fn();
const mockLaunchLibrary = jest.fn();
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: (...args: any[]) =>
    mockRequestPermission(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchLibrary(...args),
}));

// --- Hook mocks (mocked at the boundary) ----------------------------------
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

jest.mock('@/features/profile/api/getMyProfile', () => ({
  useMyProfile: () => ({
    data: mockProfile.data,
    isPending: mockProfile.isPending,
    isError: mockProfile.isError,
    refetch: mockProfile.refetch,
  }),
}));

type MutateOpts = { onSuccess?: () => void; onError?: (err: Error) => void };
const mockUpdate = {
  isPending: false,
  isError: false,
  behavior: 'resolve' as 'resolve' | 'reject',
  mutate: jest.fn((_input: unknown, opts?: MutateOpts) => {
    if (mockUpdate.behavior === 'reject') {
      opts?.onError?.(new Error('boom'));
    } else {
      opts?.onSuccess?.();
    }
  }),
};

// Live @ check: staged per test (the real hook is covered in profileApi.test.tsx).
const mockHandleTaken = { value: false };
jest.mock('@/features/profile/api/handleAvailability', () => ({
  HANDLE_TAKEN_MESSAGE: 'Esse @ já está em uso. Escolha outro.',
  useHandleTaken: () => mockHandleTaken.value,
}));

jest.mock('@/features/profile/api/updateProfile', () => ({
  useUpdateProfile: () => ({
    mutate: mockUpdate.mutate,
    isPending: mockUpdate.isPending,
    isError: mockUpdate.isError,
  }),
}));

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';

import EditProfileScreen from '../../../../app/profile/edit';

const GRANTED = { granted: true } as const;
const DENIED = { granted: false } as const;

beforeEach(() => {
  mockBack.mockClear();
  mockRequestPermission.mockReset();
  mockLaunchLibrary.mockReset();
  mockUpdate.mutate.mockClear();
  mockUpdate.isPending = false;
  mockUpdate.isError = false;
  mockUpdate.behavior = 'resolve';
  mockProfile.data = PROFILE_FIXTURE;
  mockProfile.isPending = false;
  mockProfile.isError = false;
  mockProfile.refetch.mockClear();
});

afterEach(() => {
  cleanup();
});

async function renderScreen() {
  await act(async () => {
    render(<EditProfileScreen />);
  });
}

describe('S10 — Edit-profile screen', () => {
  // --------------------------------------------------------- pre-filled fields
  /**
   * Covers: S10 — Settings
   * Criterion: "The edit form is pre-filled from useMyProfile and exposes NOME,
   *  SOBRENOME, APELIDO (@), DATA DE NASCIMENTO, NÚMERO DE TELEFONE, and a
   *  single-select POSIÇÃO EM QUADRA chip group."
   */
  it('renders all fields pre-filled from the profile and the 6 position chips', async () => {
    await renderScreen();

    // field labels present
    expect(screen.getByText('NOME')).toBeTruthy();
    expect(screen.getByText('SOBRENOME')).toBeTruthy();
    expect(screen.getByText('APELIDO')).toBeTruthy();
    expect(screen.getByText('DATA DE NASCIMENTO')).toBeTruthy();
    expect(screen.getByText('Número de telefone')).toBeTruthy();
    expect(screen.getByText('Posição em quadra')).toBeTruthy();

    // pre-filled values
    expect(screen.getByTestId('edit-first-name').props.value).toBe('Renan');
    expect(screen.getByTestId('edit-last-name').props.value).toBe('Dias');
    expect(screen.getByTestId('edit-handle').props.value).toBe('renan');
    expect(screen.getByTestId('edit-birth-date').props.value).toBe('14/03/1998');
    // phone renders the BR mask of the national digits
    expect(screen.getByTestId('edit-phone').props.value).toBe('(11) 98472-1130');

    // exactly the 6 position chips, with LEV pre-selected (single-select)
    for (const code of ['LEV', 'PON', 'OPO', 'CEN', 'LIB', 'COR']) {
      expect(screen.getByTestId(`edit-position-${code}`)).toBeTruthy();
    }
    expect(
      screen.getByTestId('edit-position-LEV').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('edit-position-PON').props.accessibilityState?.selected,
    ).toBe(false);
  });

  /**
   * Covers: S10 — Settings
   * Criterion: POSIÇÃO is single-select — selecting another chip deselects the
   *  pre-selected one.
   */
  it('single-selects the position chips', async () => {
    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-position-OPO'));
    });

    expect(
      screen.getByTestId('edit-position-OPO').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('edit-position-LEV').props.accessibilityState?.selected,
    ).toBe(false);
  });

  // -------------------------------------------------------------- validation
  /**
   * Covers: S10 — Settings
   * Criterion: "Edit form validates via React Hook Form + Zod (invalid @handle /
   *  empty name / invalid date surface inline errors)."
   */
  it('surfaces inline Zod errors for empty name and invalid date and does not submit', async () => {
    await renderScreen();

    // empty first name
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('edit-first-name'), '');
    });
    // invalid date (real-past-date refine fails: 31/02 is not a real calendar date)
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('edit-birth-date'), '31022000');
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-save'));
    });

    expect(screen.getByText('Informe seu nome')).toBeTruthy();
    expect(screen.getByText('Data inválida')).toBeTruthy();
    // invalid form never reaches the mutation
    expect(mockUpdate.mutate).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------ apelido is read-only
  /**
   * Covers: S10 — Settings
   * The @handle is a permanent identifier and must not be editable from the
   * edit-profile form.
   */
  it('renders the APELIDO field as read-only (not editable)', async () => {
    await renderScreen();

    expect(screen.getByTestId('edit-handle').props.editable).toBe(false);
  });

  // --------------------------------------------------- save (primary CTA flow)
  /**
   * Covers: S10 — Settings
   * Criterion: "'Salvar alterações' ... calls useUpdateProfile ... and returns to
   *  the list on success."
   */
  it('calls useUpdateProfile with the validated values and returns to the list on success', async () => {
    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-save'));
    });

    expect(mockUpdate.mutate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mutate.mock.calls[0]?.[0]).toMatchObject({
      firstName: 'Renan',
      lastName: 'Dias',
      handle: 'renan',
      birthDate: '14/03/1998',
      phone: '11984721130',
      position: 'LEV',
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  /**
   * Covers: S10 — Settings
   * Criterion: "'Salvar alterações' ... shows a loading state." While the mutation
   *  is pending the CTA is busy/disabled (Button loading contract).
   */
  it('shows the loading state on the CTA while the mutation is pending', async () => {
    mockUpdate.isPending = true;
    await renderScreen();

    const cta = screen.getByTestId('edit-save');
    expect(cta.props.accessibilityState?.busy).toBe(true);
    expect(cta.props.accessibilityState?.disabled).toBe(true);
  });

  /**
   * Covers: S10 — Settings (Loading / error states)
   * On a mutation error the user stays on the form (no router.back) and an inline
   *  polite error is surfaced.
   */
  it('keeps the user on the form and surfaces an inline error when the mutation rejects', async () => {
    mockUpdate.behavior = 'reject';
    mockUpdate.isError = true;
    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-save'));
    });

    expect(mockUpdate.mutate).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
    const status = screen.getByText('Não foi possível salvar. Tente novamente.');
    expect(status.props.accessibilityLiveRegion).toBe('polite');
  });

  // ----------------------------------------------------------- Trocar foto
  /**
   * Covers: S10 — Settings
   * Criterion: "'Trocar foto' launches the image library picker; after picking, the
   *  avatar preview updates to the chosen local URI and that URI is included in the
   *  useUpdateProfile payload." Permission is requested before launching.
   */
  it('requests permission, launches the picker, previews the URI and includes it in the save payload', async () => {
    mockRequestPermission.mockResolvedValue(GRANTED);
    mockLaunchLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/new-avatar.jpg' }],
    });

    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Trocar foto'));
    });

    // permission requested before launching the library
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockLaunchLibrary).toHaveBeenCalledTimes(1);

    // the avatar preview now points at the chosen local URI
    expect(screen.getByLabelText('Avatar de Renan').props.source).toEqual({
      uri: 'file:///tmp/new-avatar.jpg',
    });

    // the picked URI is carried into the save payload
    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-save'));
    });
    expect(mockUpdate.mutate.mock.calls[0]?.[0]).toMatchObject({
      avatarUri: 'file:///tmp/new-avatar.jpg',
    });
  });

  /**
   * Covers: S10 — Settings
   * Criterion: "Media-library permission is requested before launching; denial is
   *  handled gracefully (no crash)." On denial the picker is never launched and a
   *  polite inline message is shown.
   */
  it('handles permission denial gracefully without launching the picker', async () => {
    mockRequestPermission.mockResolvedValue(DENIED);

    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Trocar foto'));
    });

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockLaunchLibrary).not.toHaveBeenCalled();
    // a polite inline denial message is shown, no crash
    expect(screen.getByText(/permiss[ãa]o de fotos negada/i)).toBeTruthy();
  });

  /**
   * Covers: S10 — Settings
   * Criterion: canceling the picker leaves the existing avatar unchanged (no URI
   *  in the payload). Guards the "non-canceled result" wording.
   */
  it('keeps the existing avatar when the picker is canceled', async () => {
    mockRequestPermission.mockResolvedValue(GRANTED);
    mockLaunchLibrary.mockResolvedValue({ canceled: true });

    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Trocar foto'));
    });

    // avatar still shows the original profile URL
    expect(screen.getByLabelText('Avatar de Renan').props.source).toEqual({
      uri: 'https://example.com/me.png',
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-save'));
    });
    expect(
      (mockUpdate.mutate.mock.calls[0]?.[0] as { avatarUri?: string } | undefined)
        ?.avatarUri,
    ).toBeUndefined();
  });

  // --------------------------------------------------- loading / error (read)
  /**
   * Covers: S10 — Settings (Loading / error states)
   * While the profile read is pending the form is replaced by a skeleton (no
   *  fields yet).
   */
  it('shows a skeleton while the profile read is pending', async () => {
    mockProfile.isPending = true;
    mockProfile.data = undefined;
    await renderScreen();

    expect(screen.queryByTestId('edit-first-name')).toBeNull();
    expect(screen.queryByTestId('edit-save')).toBeNull();
  });

  /**
   * Covers: S10 — Settings (Loading / error states)
   * On a profile read error a retry row is shown and refetch fires.
   */
  it('shows a retry row on a profile read error and refetches', async () => {
    mockProfile.isError = true;
    mockProfile.data = undefined;
    await renderScreen();

    expect(
      screen.getByText('Não foi possível carregar seu perfil'),
    ).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByText('Tentar novamente'));
    });
    expect(mockProfile.refetch).toHaveBeenCalledTimes(1);
  });

  // ------------------------------------------------------------ header / scope
  /**
   * Covers: S10 — Settings
   * Criterion: "No bottom tab bar ...; back returns to the previous screen." The
   *  header exposes the back affordance; no tab labels render.
   */
  it('renders the EDITAR PERFIL header with a back affordance and no tab bar', async () => {
    await renderScreen();

    const title = screen.getByText('Editar perfil');
    expect(title.props.className).toContain('font-display');
    expect(title.props.className).toContain('uppercase');

    fireEvent.press(screen.getByLabelText('Voltar'));
    expect(mockBack).toHaveBeenCalledTimes(1);

    expect(screen.queryByText('Início')).toBeNull();
    expect(screen.queryByText('Explorar')).toBeNull();
  });
});
