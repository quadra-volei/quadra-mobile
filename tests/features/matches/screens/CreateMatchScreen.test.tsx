/**
 * S11 — Create-match screen tests (`app/matches/create.tsx`).
 *
 * The screen is a "formulário vivo" (progressive disclosure) port of the Quadra
 * prototype: a single conversational flow where each answer reveals the next
 * block, a top progress bar, and a sticky footer CTA that stays disabled
 * ("Responda pra continuar") until every required answer is given.
 *
 * Covered here:
 *  - Header: inline back chevron (accessibilityLabel "Voltar" -> router.back) and
 *    the "CRIAR PARTIDA" display/uppercase title; no tab bar.
 *  - Progressive disclosure: only block 1 shows initially; LOCAL reveals after a
 *    2+ char name; TIPO after a 2+ char location; and so on down the chain.
 *  - CoverPicker: granted pick previews the uri and includes it in the payload;
 *    permission denial shows a polite inline message; cancel keeps the placeholder.
 *  - The footer CTA is disabled until the whole flow is complete.
 *  - A OneOff happy path completes -> useCreateMatch called with the full payload
 *    (whenType/time/duration/format/level/privacy...) -> success screen.
 *  - The Recurring branch reveals the weekday/frequency/start scheduler.
 *  - Success CTAs route to /matches/[id] and /(tabs) via router.replace.
 *  - A failed (mock-forced) create shows the inline retryable error.
 *
 * useCreateMatch is mocked at the boundary. expo-image-picker is mocked so the
 * permission/pick branches are deterministic. The Zod resolver runs for real.
 * Native modules (reanimated/safe-area/expo-image/expo-linear-gradient/lucide/
 * Button) are stubbed inline. The TextField/SearchField/FilterChip/StepperField/
 * DateField/CoverPicker primitives render for real (queried by testID).
 */
import React from 'react';

// --- Native / module mocks ------------------------------------------------

jest.mock('react-native-reanimated', () => {
  const ReactLocal = require('react');
  const { ScrollView, View } = require('react-native');
  // Strip animation-only props so RN host components don't receive them.
  const AnimatedView = ({ children, style, entering, exiting, ...props }: any) =>
    ReactLocal.createElement(View, { ...props, style }, children);
  const AnimatedScrollView = ({ children, style, ...props }: any) =>
    ReactLocal.createElement(ScrollView, { ...props, style }, children);
  const chain: any = {
    duration: () => chain,
    delay: () => chain,
    springify: () => chain,
  };
  return {
    __esModule: true,
    default: { View: AnimatedView, ScrollView: AnimatedScrollView },
    FadeInDown: chain,
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

jest.mock('expo-linear-gradient', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: any) =>
      ReactLocal.createElement(View, props, children),
  };
});

jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) =>
    ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  return {
    ChevronLeft: stub('chevron-left'),
    Check: stub('check'),
    Clock: stub('clock'),
    Copy: stub('copy'),
    Heart: stub('heart'),
    Lock: stub('lock'),
    MapPin: stub('map-pin'),
    Pencil: stub('pencil'),
    Search: stub('search'),
    Share2: stub('share2'),
    Users: stub('users'),
    Zap: stub('zap'),
    Minus: stub('minus'),
    Plus: stub('plus'),
    Calendar: stub('calendar'),
    X: stub('x'),
  };
});

// Button stub: a plain Pressable that respects disabled/loading so the
// "Responda pra continuar" gate is testable (RNTL blocks press on disabled).
jest.mock('@/components/ui/Button', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID, loading, disabled }: any) => {
      const isDisabled = Boolean(loading || disabled);
      return ReactLocal.createElement(
        Pressable,
        {
          onPress,
          testID,
          disabled: isDisabled,
          accessibilityRole: 'button',
          accessibilityState: { busy: Boolean(loading), disabled: isDisabled },
        },
        ReactLocal.createElement(Text, null, children),
      );
    },
  };
});

// expo-router: spyable router.back / router.replace.
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: (...args: any[]) => mockBack(...args),
    replace: (...args: any[]) => mockReplace(...args),
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

// useCreateMatch mocked at the boundary (no fake latency / no network).
type MutateOpts = {
  onSuccess?: (data: { match: { id: string } }) => void;
  onError?: (err: Error) => void;
};
const mockCreate = {
  isPending: false,
  isError: false,
  behavior: 'resolve' as 'resolve' | 'reject',
  resultId: 'mine-mock-1',
  mutate: jest.fn((_payload: unknown, opts?: MutateOpts) => {
    if (mockCreate.behavior === 'reject') {
      opts?.onError?.(new Error('boom'));
    } else {
      opts?.onSuccess?.({ match: { id: mockCreate.resultId } });
    }
  }),
};

jest.mock('@/features/matches/api/createMatch', () => ({
  useCreateMatch: () => ({
    mutate: mockCreate.mutate,
    isPending: mockCreate.isPending,
    isError: mockCreate.isError,
  }),
}));

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';

import CreateMatchScreen from '../../../../app/matches/create';

const GRANTED = { granted: true } as const;
const DENIED = { granted: false } as const;
const PICKED_URI = 'file:///tmp/cover.jpg';

beforeEach(() => {
  mockBack.mockClear();
  mockReplace.mockClear();
  mockRequestPermission.mockReset();
  mockLaunchLibrary.mockReset();
  mockCreate.mutate.mockClear();
  mockCreate.isPending = false;
  mockCreate.isError = false;
  mockCreate.behavior = 'resolve';
  mockCreate.resultId = 'mine-mock-1';
});

afterEach(() => {
  cleanup();
});

async function renderScreen() {
  await act(async () => {
    render(<CreateMatchScreen />);
  });
}

async function press(testID: string) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

async function type(testID: string, text: string) {
  await act(async () => {
    fireEvent.changeText(screen.getByTestId(testID), text);
  });
}

/** Answers the whole OneOff · open flow so the footer CTA becomes enabled. */
async function completeOneOffFlow() {
  await type('match-name', 'Racha de Quinta'); // → reveals LOCAL
  await type('match-location', 'Arena Central'); // → reveals TIPO
  await press('type-OneOff'); // → reveals QUANDO chips
  await press('when-today'); // date ready → reveals horário
  await press('time-19h00'); // → reveals duração (default 1h30) → FORMATO
  await press('format-6X6'); // sets players 12 → reveals NÍVEL
  await press('level-INTERMEDIARIO'); // → reveals VALOR (price default 25)
  await press('confirm-24'); // → reveals PRIVACIDADE
  await press('privacy-open'); // → complete
}

describe('S11 — Create-match (formulário vivo)', () => {
  // ------------------------------------------------------------ header / scope
  it('renders the CRIAR PARTIDA header with a back affordance and no tab bar', async () => {
    await renderScreen();

    const title = screen
      .getAllByText('Criar partida')
      .find((n) => String(n.props.className).includes('font-display'));
    expect(title).toBeTruthy();
    expect(title?.props.className).toContain('uppercase');

    fireEvent.press(screen.getByLabelText('Voltar'));
    expect(mockBack).toHaveBeenCalledTimes(1);

    expect(screen.queryByText('Início')).toBeNull();
    expect(screen.queryByText('Explorar')).toBeNull();
    expect(screen.queryByText('Perfil')).toBeNull();
  });

  // ----------------------------------------------------- progressive disclosure
  it('shows only block 1 initially and reveals the next block per answer', async () => {
    await renderScreen();

    // Block 1 (name) is visible; nothing downstream is.
    expect(screen.getByTestId('match-name')).toBeTruthy();
    expect(screen.queryByTestId('match-location')).toBeNull();
    expect(screen.queryByTestId('type-OneOff')).toBeNull();

    // A 2+ char name reveals LOCAL.
    await type('match-name', 'Racha de Quinta');
    expect(screen.getByTestId('match-location')).toBeTruthy();
    expect(screen.queryByTestId('type-OneOff')).toBeNull();

    // A 2+ char location reveals TIPO.
    await type('match-location', 'Arena Central');
    expect(screen.getByTestId('type-OneOff')).toBeTruthy();
    expect(screen.getByTestId('type-Recurring')).toBeTruthy();
    // Format/level are still gated behind the schedule.
    expect(screen.queryByTestId('format-6X6')).toBeNull();
    expect(screen.queryByTestId('level-INTERMEDIARIO')).toBeNull();
  });

  // ----------------------------------------------------------------- cover
  it('renders the cover placeholder with CAPA DA PARTIDA and Trocar capa', async () => {
    await renderScreen();
    expect(screen.getByText('Capa da partida')).toBeTruthy();
    expect(screen.getByText('Trocar capa')).toBeTruthy();
    expect(screen.queryByTestId('cover-picker-image')).toBeNull();
  });

  it('previews the picked cover uri and includes it in the submit payload', async () => {
    mockRequestPermission.mockResolvedValue(GRANTED);
    mockLaunchLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: PICKED_URI }],
    });

    await renderScreen();
    await press('cover-picker');

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockLaunchLibrary).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('cover-picker-image').props.source).toEqual({
      uri: PICKED_URI,
    });

    await completeOneOffFlow();
    await press('create-submit');
    expect(mockCreate.mutate.mock.calls[0]?.[0]).toMatchObject({
      coverUri: PICKED_URI,
    });
  });

  it('shows a polite inline message on permission denial without launching the picker', async () => {
    mockRequestPermission.mockResolvedValue(DENIED);

    await renderScreen();
    await press('cover-picker');

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockLaunchLibrary).not.toHaveBeenCalled();

    const msg = screen.getByText(/permiss[ãa]o de fotos negada/i);
    expect(msg.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.queryByTestId('cover-picker-image')).toBeNull();
  });

  it('keeps the placeholder and omits coverUri when the picker is canceled', async () => {
    mockRequestPermission.mockResolvedValue(GRANTED);
    mockLaunchLibrary.mockResolvedValue({ canceled: true });

    await renderScreen();
    await press('cover-picker');
    expect(screen.queryByTestId('cover-picker-image')).toBeNull();

    await completeOneOffFlow();
    await press('create-submit');
    expect(
      (mockCreate.mutate.mock.calls[0]?.[0] as { coverUri?: string } | undefined)
        ?.coverUri,
    ).toBeUndefined();
  });

  // --------------------------------------------------------- footer CTA gating
  it('keeps the footer CTA disabled ("Responda pra continuar") until complete', async () => {
    await renderScreen();

    const ctaBefore = screen.getByTestId('create-submit');
    expect(ctaBefore.props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByText('Responda pra continuar')).toBeTruthy();

    // Pressing while disabled must not submit.
    await press('create-submit');
    expect(mockCreate.mutate).not.toHaveBeenCalled();

    await completeOneOffFlow();
    const ctaAfter = screen.getByTestId('create-submit');
    expect(ctaAfter.props.accessibilityState?.disabled).toBe(false);
    // CTA label flips from the gate copy to "Criar partida".
    expect(screen.queryByText('Responda pra continuar')).toBeNull();
    expect(within(ctaAfter).getByText('Criar partida')).toBeTruthy();
  });

  // --------------------------------------------------- OneOff happy path
  it('submits the full OneOff payload and renders the success screen', async () => {
    await renderScreen();
    await completeOneOffFlow();
    await press('create-submit');

    expect(mockCreate.mutate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mutate.mock.calls[0]?.[0]).toMatchObject({
      name: 'Racha de Quinta',
      location: 'Arena Central',
      type: 'OneOff',
      whenType: 'today',
      time: '19h00',
      duration: '1h30',
      format: '6X6',
      level: 'INTERMEDIARIO',
      players: 12,
      price: 25,
      confirmationOpensHoursBefore: 24,
      privacy: 'open',
    });

    expect(screen.getByText('Partida criada!')).toBeTruthy();
    expect(screen.queryByTestId('type-OneOff')).toBeNull();
  });

  it('pre-fills the suggested player count when a format is chosen', async () => {
    await renderScreen();
    await type('match-name', 'Racha de Quinta');
    await type('match-location', 'Arena Central');
    await press('type-OneOff');
    await press('when-today');
    await press('time-19h00');
    await press('format-2X2'); // 2x2 suggests 4 players (no manual stepper)

    await press('level-INTERMEDIARIO');
    await press('confirm-24');
    await press('privacy-open');
    await press('create-submit');
    expect(mockCreate.mutate.mock.calls[0]?.[0]).toMatchObject({
      format: '2X2',
      players: 4,
    });
  });

  // --------------------------------------------------- Recurring branch
  it('reveals the recurring scheduler (weekdays + frequency + start) for Recorrente', async () => {
    await renderScreen();
    await type('match-name', 'Racha de Quinta');
    await type('match-location', 'Arena Central');
    await press('type-Recurring');

    // Weekday toggles + frequency chips + start date appear; OneOff chips do not.
    expect(screen.getByTestId('rec-day-0')).toBeTruthy();
    expect(screen.getByTestId('rec-freq-weekly')).toBeTruthy();
    expect(screen.getByTestId('rec-start')).toBeTruthy();
    expect(screen.queryByTestId('when-today')).toBeNull();

    // The horário block stays hidden until a day + start date are set.
    expect(screen.queryByTestId('time-19h00')).toBeNull();
    await press('rec-day-3'); // Wednesday
    await type('rec-start', '03072026'); // masked to 03/07/2026
    expect(screen.getByTestId('time-19h00')).toBeTruthy();
  });

  it('completes a Recurring · private (guests) flow and submits its payload', async () => {
    await renderScreen();
    await type('match-name', 'Racha Fixo');
    await type('match-location', 'Arena Central');
    await press('type-Recurring');
    await press('rec-day-3');
    await type('rec-start', '03072026');
    await press('time-20h00');
    await press('format-6X6');
    await press('level-AVANCADO');
    await press('confirm-12');
    await press('privacy-private');
    // Private requires an invite mode before the flow is complete.
    expect(screen.getByTestId('create-submit').props.accessibilityState?.disabled).toBe(
      true,
    );
    await press('invite-guests');

    await press('create-submit');
    expect(mockCreate.mutate.mock.calls[0]?.[0]).toMatchObject({
      type: 'Recurring',
      recDays: [3],
      recStart: '03/07/2026',
      time: '20h00',
      format: '6X6',
      level: 'AVANCADO',
      confirmationOpensHoursBefore: 12,
      privacy: 'private',
      inviteMode: 'guests',
    });
  });

  // -------------------------------------------------------- success CTAs
  it('routes "Ver a partida criada" to /matches/[id] with the new id', async () => {
    mockCreate.resultId = 'mine-42';
    await renderScreen();
    await completeOneOffFlow();
    await press('create-submit');

    await press('created-view-match');
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/matches/[id]',
      params: { id: 'mine-42' },
    });
  });

  it('routes "Voltar ao início" to /(tabs)', async () => {
    await renderScreen();
    await completeOneOffFlow();
    await press('create-submit');

    await press('created-home');
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  // ------------------------------------------------------- error / retry
  it('shows an inline retryable error on a failed create', async () => {
    mockCreate.behavior = 'reject';
    mockCreate.isError = true;

    await renderScreen();
    await completeOneOffFlow();
    await press('create-submit');

    expect(mockCreate.mutate).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Partida criada!')).toBeNull();

    const err = screen.getByText(
      'Não foi possível criar a partida. Tente novamente.',
    );
    expect(err.props.accessibilityLiveRegion).toBe('polite');
    expect(
      screen.getByTestId('create-submit').props.accessibilityState?.disabled,
    ).toBe(false);
  });
});
