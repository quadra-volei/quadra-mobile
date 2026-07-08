/**
 * S10 — Feedback screen tests (`app/profile/feedback.tsx`).
 *
 * Covers the in-app feedback form that replaces the old `mailto:` hand-off:
 *  - Header shows a back affordance and the "FEEDBACK" display title (uppercase,
 *    font-display).
 *  - TIPO offers Sugestão / Problema / Elogio as single-select tiles; Sugestão is
 *    selected by default and selecting another deselects it.
 *  - SUA MENSAGEM is a multiline field with the reference placeholder.
 *  - "Enviando como" shows the authenticated user's name · @handle.
 *  - "Enviar feedback" is disabled until a message is typed; on submit it calls
 *    useSendFeedback with { type, message } and returns to the list on success.
 *  - While the mutation is pending the CTA is busy/disabled.
 *  - On a mutation error the user stays on the screen with an inline polite error.
 *  - No bottom tab bar.
 *
 * The profile read + send hooks are mocked at the boundary; the Zod resolver runs
 * for real. Native modules (safe-area, expo-image, lucide, Button) are stubbed
 * inline — the repo's tests/__mocks__ are NOT auto-applied.
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
    Flame: stub('flame'),
    Zap: stub('zap'),
    Heart: stub('heart'),
    Share2: stub('share-2'),
  };
});

// Button is a NativeWind (css-interop) Pressable. Stub it as a plain Pressable
// that forwards loading/disabled -> accessibilityState so the CTA gating and
// loading criteria stay queryable. Its internals are covered by its own tests.
jest.mock('@/components/ui/Button', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID, loading, disabled }: any) =>
      ReactLocal.createElement(
        Pressable,
        {
          onPress,
          testID,
          disabled: Boolean(disabled || loading),
          accessibilityRole: 'button',
          accessibilityState: {
            busy: Boolean(loading),
            disabled: Boolean(disabled || loading),
          },
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

// --- Hook mocks (mocked at the boundary) ----------------------------------
import type { MyProfile } from '@/features/profile/types/profile';

const PROFILE_FIXTURE: MyProfile = {
  id: 'me',
  firstName: 'Renan',
  avatarUrl: 'https://example.com/me.png',
  overall: 68,
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
} = {
  data: PROFILE_FIXTURE,
  isPending: false,
};

jest.mock('@/features/profile/api/getMyProfile', () => ({
  useMyProfile: () => ({
    data: mockProfile.data,
    isPending: mockProfile.isPending,
  }),
}));

type MutateOpts = { onSuccess?: () => void; onError?: (err: Error) => void };
const mockSend = {
  isPending: false,
  isError: false,
  behavior: 'resolve' as 'resolve' | 'reject',
  mutate: jest.fn((_input: unknown, opts?: MutateOpts) => {
    if (mockSend.behavior === 'reject') {
      opts?.onError?.(new Error('boom'));
    } else {
      opts?.onSuccess?.();
    }
  }),
};

jest.mock('@/features/profile/api/sendFeedback', () => ({
  useSendFeedback: () => ({
    mutate: mockSend.mutate,
    isPending: mockSend.isPending,
    isError: mockSend.isError,
  }),
}));

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';

import FeedbackScreen from '../../../../app/profile/feedback';

beforeEach(() => {
  mockBack.mockClear();
  mockSend.mutate.mockClear();
  mockSend.isPending = false;
  mockSend.isError = false;
  mockSend.behavior = 'resolve';
  mockProfile.data = PROFILE_FIXTURE;
  mockProfile.isPending = false;
});

afterEach(() => {
  cleanup();
});

async function renderScreen() {
  await act(async () => {
    render(<FeedbackScreen />);
  });
}

describe('S10 — Feedback screen', () => {
  // ------------------------------------------------------------------- header
  it('renders the FEEDBACK display title with a back affordance', async () => {
    await renderScreen();

    const title = screen.getByText('Feedback');
    expect(title.props.className).toContain('font-display');
    expect(title.props.className).toContain('uppercase');

    fireEvent.press(screen.getByLabelText('Voltar'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------- type tiles
  it('offers the three type tiles with Sugestão selected by default', async () => {
    await renderScreen();

    expect(screen.getByLabelText('Sugestão')).toBeTruthy();
    expect(screen.getByLabelText('Problema')).toBeTruthy();
    expect(screen.getByLabelText('Elogio')).toBeTruthy();

    expect(
      screen.getByLabelText('Sugestão').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByLabelText('Problema').props.accessibilityState?.selected,
    ).toBe(false);
  });

  it('single-selects the type tiles', async () => {
    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Problema'));
    });

    expect(
      screen.getByLabelText('Problema').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByLabelText('Sugestão').props.accessibilityState?.selected,
    ).toBe(false);
  });

  // ---------------------------------------------------------------- message
  it('renders the multiline message field with the reference placeholder', async () => {
    await renderScreen();

    const field = screen.getByTestId('feedback-message');
    expect(field.props.multiline).toBe(true);
    expect(field.props.placeholder).toMatch(/conta pra gente/i);
  });

  // ------------------------------------------------------------ Enviando como
  it('shows the authenticated user as "name · @handle"', async () => {
    await renderScreen();

    expect(screen.getByText('Enviando como')).toBeTruthy();
    expect(screen.getByText('Renan Dias · @renan')).toBeTruthy();
  });

  // --------------------------------------------------------------- CTA gating
  it('disables the submit CTA until a message is typed', async () => {
    await renderScreen();

    const cta = screen.getByTestId('feedback-submit');
    expect(cta.props.accessibilityState?.disabled).toBe(true);

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('feedback-message'), 'Muito bom!');
    });

    expect(
      screen.getByTestId('feedback-submit').props.accessibilityState?.disabled,
    ).toBe(false);
  });

  it('does not submit when the message is empty', async () => {
    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId('feedback-submit'));
    });

    expect(mockSend.mutate).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------ submit (happy)
  it('sends { type, message } and returns to the list on success', async () => {
    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Problema'));
    });
    await act(async () => {
      fireEvent.changeText(
        screen.getByTestId('feedback-message'),
        '  O placar travou  ',
      );
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('feedback-submit'));
    });

    expect(mockSend.mutate).toHaveBeenCalledTimes(1);
    // Zod trims the message before it reaches the mutation.
    expect(mockSend.mutate.mock.calls[0]?.[0]).toMatchObject({
      type: 'problem',
      message: 'O placar travou',
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  // ------------------------------------------------------------- loading / error
  it('shows the loading state on the CTA while the mutation is pending', async () => {
    mockSend.isPending = true;
    await renderScreen();

    const cta = screen.getByTestId('feedback-submit');
    expect(cta.props.accessibilityState?.busy).toBe(true);
    expect(cta.props.accessibilityState?.disabled).toBe(true);
  });

  it('keeps the user on the screen and surfaces an inline error when the mutation rejects', async () => {
    mockSend.behavior = 'reject';
    mockSend.isError = true;
    await renderScreen();

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('feedback-message'), 'Deu erro');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('feedback-submit'));
    });

    expect(mockSend.mutate).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
    const status = screen.getByText('Não foi possível enviar. Tente novamente.');
    expect(status.props.accessibilityLiveRegion).toBe('polite');
  });

  // ----------------------------------------------------------------- tab bar
  it('renders no bottom tab bar (no tab labels in the screen body)', async () => {
    await renderScreen();

    expect(screen.queryByText('Início')).toBeNull();
    expect(screen.queryByText('Explorar')).toBeNull();
    expect(screen.queryByText('Rede')).toBeNull();
    expect(screen.queryByText('Perfil')).toBeNull();
  });
});
