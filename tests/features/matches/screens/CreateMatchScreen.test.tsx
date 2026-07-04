/**
 * S11 — Create-match screen tests (`app/matches/create.tsx`).
 *
 * Covers every acceptance criterion of docs/specs/S11-create-match.md:
 *  - Header: inline back chevron (accessibilityLabel "Voltar" -> router.back) and
 *    the "CRIAR PARTIDA" display/uppercase title; no tab bar.
 *  - CoverPicker: with expo-image-picker mocked (granted + fixed asset uri), tapping
 *    "Trocar capa" renders the selected uri and includes it in the submit payload;
 *    permission denial shows a polite inline message and does not crash.
 *  - NOME required (empty -> field error, mutation blocked).
 *  - LOCAL required free text (empty -> error, mutation blocked).
 *  - QUANDO defaults to "Hoje", single-select among Hoje/Amanhã/Sex/Sáb; no "+"
 *    chip, no time control.
 *  - FORMATO defaults 6x6 single-select; NÍVEL defaults Intermediário single-select.
 *  - TIPO defaults "Avulso" (OneOff), single-select; chosen value in payload.
 *  - Players stepper defaults 12, min 2; price accepts 0 and positive.
 *  - CONFIRMAÇÕES ABREM defaults "24h antes" (24), single-select; chosen value in
 *    payload.
 *  - "Partida aberta" toggle reflects/updates isOpen (default off).
 *  - Valid submit -> useCreateMatch called with the full payload -> loading state ->
 *    "PARTIDA CRIADA!" success screen.
 *  - Success CTAs route to /matches/[id] and /(tabs) via router.replace.
 *  - Failed (mock-forced) create -> inline retryable error + button re-enabled.
 *
 * useCreateMatch is mocked at the boundary (no latency/network). expo-image-picker
 * is mocked so permission/pick branches are deterministic. The Zod resolver runs
 * for real (the validation criteria are the contract). Native modules
 * (reanimated/safe-area/expo-image/expo-linear-gradient/lucide/Button) are stubbed
 * inline — the repo's tests/__mocks__ are NOT auto-applied. The
 * TextField/SearchField/FilterChip/StepperField/ToggleField primitives render for
 * real (queried by testID). The ['matches'] invalidation criterion is covered
 * against the real hook in tests/features/matches/api/createMatch.test.tsx.
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
    useAnimatedStyle: (cb: () => object) => cb(),
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
    Lock: stub('lock'),
    MapPin: stub('map-pin'),
    Share2: stub('share2'),
    Pencil: stub('pencil'),
    Minus: stub('minus'),
    Plus: stub('plus'),
    Search: stub('search'),
    X: stub('x'),
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
          disabled: Boolean(loading),
          accessibilityRole: 'button',
          accessibilityState: {
            busy: Boolean(loading),
            disabled: Boolean(loading),
          },
        },
        ReactLocal.createElement(Text, null, children),
      ),
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
  resultId: 'mock-match-1',
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
  mockCreate.resultId = 'mock-match-1';
});

afterEach(() => {
  cleanup();
});

async function renderScreen() {
  await act(async () => {
    render(<CreateMatchScreen />);
  });
}

/** Fills the two required fields (NOME, LOCAL) so a submit can be valid. */
async function fillRequired() {
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('match-name'), 'Racha de Quinta');
  });
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('match-location'), 'Arena Central');
  });
}

async function submit() {
  await act(async () => {
    fireEvent.press(screen.getByTestId('create-submit'));
  });
}

describe('S11 — Create-match screen', () => {
  // ------------------------------------------------------------ header / scope
  /**
   * Covers: S11 — Create Match
   * Criterion: "Header shows an inline back chevron (accessibilityLabel 'Voltar',
   *  calls router.back()) and the 'CRIAR PARTIDA' title (font-display, uppercase)";
   *  "No tab bar is shown on this stack screen."
   */
  it('renders the CRIAR PARTIDA header with a back affordance and no tab bar', async () => {
    await renderScreen();

    // "Criar partida" appears twice (header title + CTA label); the title is the
    // font-display/uppercase one.
    const title = screen
      .getAllByText('Criar partida')
      .find((n) => String(n.props.className).includes('font-display'));
    expect(title).toBeTruthy();
    expect(title?.props.className).toContain('font-display');
    expect(title?.props.className).toContain('uppercase');

    fireEvent.press(screen.getByLabelText('Voltar'));
    expect(mockBack).toHaveBeenCalledTimes(1);

    // no tab labels render on this stack screen
    expect(screen.queryByText('Início')).toBeNull();
    expect(screen.queryByText('Explorar')).toBeNull();
    expect(screen.queryByText('Perfil')).toBeNull();
  });

  // ----------------------------------------------------------------- cover
  /**
   * Covers: S11 — Create Match
   * Criterion: "The cover block renders the navy 'CAPA DA PARTIDA' placeholder with
   *  'Trocar capa'."
   */
  it('renders the cover placeholder with CAPA DA PARTIDA and Trocar capa', async () => {
    await renderScreen();

    expect(screen.getByText('Capa da partida')).toBeTruthy();
    expect(screen.getByText('Trocar capa')).toBeTruthy();
    // placeholder shown, no chosen image yet
    expect(screen.queryByTestId('cover-picker-image')).toBeNull();
  });

  /**
   * Covers: S11 — Create Match
   * Criterion: "With expo-image-picker mocked (granted + fixed asset uri), tapping
   *  'Trocar capa' updates CoverPicker to render that selected uri, and that uri is
   *  included in the useCreateMatch payload on submit."
   */
  it('previews the picked cover uri and includes it in the submit payload', async () => {
    mockRequestPermission.mockResolvedValue(GRANTED);
    mockLaunchLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: PICKED_URI }],
    });

    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId('cover-picker'));
    });

    // permission requested before launching, then library launched
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockLaunchLibrary).toHaveBeenCalledTimes(1);

    // the cover now renders the chosen local uri
    expect(screen.getByTestId('cover-picker-image').props.source).toEqual({
      uri: PICKED_URI,
    });

    // the picked uri is carried into the submit payload
    await fillRequired();
    await submit();
    expect(mockCreate.mutate.mock.calls[0]?.[0]).toMatchObject({
      coverUri: PICKED_URI,
    });
  });

  /**
   * Covers: S11 — Create Match
   * Criterion: "Permission denial shows a polite inline message and does not crash."
   */
  it('shows a polite inline message on permission denial without launching the picker', async () => {
    mockRequestPermission.mockResolvedValue(DENIED);

    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId('cover-picker'));
    });

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockLaunchLibrary).not.toHaveBeenCalled();

    const msg = screen.getByText(/permiss[ãa]o de fotos negada/i);
    expect(msg.props.accessibilityLiveRegion).toBe('polite');
    // no preview image, no crash
    expect(screen.queryByTestId('cover-picker-image')).toBeNull();
  });

  /**
   * Covers: S11 — Create Match (cover, non-canceled wording)
   * Canceling the picker leaves the placeholder (no uri in the payload).
   */
  it('keeps the placeholder and omits coverUri when the picker is canceled', async () => {
    mockRequestPermission.mockResolvedValue(GRANTED);
    mockLaunchLibrary.mockResolvedValue({ canceled: true });

    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId('cover-picker'));
    });

    expect(screen.queryByTestId('cover-picker-image')).toBeNull();

    await fillRequired();
    await submit();
    expect(
      (mockCreate.mutate.mock.calls[0]?.[0] as { coverUri?: string } | undefined)
        ?.coverUri,
    ).toBeUndefined();
  });

  // --------------------------------------------------------------- NOME / LOCAL
  /**
   * Covers: S11 — Create Match
   * Criterion: "'NOME DA PARTIDA' is required; submitting empty shows the field
   *  error and blocks the mutation."
   */
  it('blocks submit and shows the NOME error when name is empty', async () => {
    await renderScreen();

    // fill only LOCAL so NOME is the sole failure
    await act(async () => {
      fireEvent.changeText(
        screen.getByTestId('match-location'),
        'Arena Central',
      );
    });
    await submit();

    expect(screen.getByText('Dê um nome à partida')).toBeTruthy();
    expect(mockCreate.mutate).not.toHaveBeenCalled();
  });

  /**
   * Covers: S11 — Create Match
   * Criterion: "'LOCAL' captures free text and is required; submitting empty shows
   *  its error and blocks the mutation."
   */
  it('blocks submit and shows the LOCAL error when location is empty', async () => {
    await renderScreen();

    // fill only NOME so LOCAL is the sole failure
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('match-name'), 'Racha de Quinta');
    });
    await submit();

    expect(screen.getByText('Informe o local')).toBeTruthy();
    expect(mockCreate.mutate).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------- QUANDO
  /**
   * Covers: S11 — Create Match
   * Criterion: "QUANDO defaults to 'Hoje' selected, single-select among
   *  Hoje/Amanhã/Sex/Sáb; there is no '+' chip and no time control on the screen."
   */
  it('defaults QUANDO to Hoje, single-selects among the 4 chips, with no "+" / no time', async () => {
    await renderScreen();

    expect(
      screen.getByTestId('day-today').props.accessibilityState?.selected,
    ).toBe(true);
    for (const id of ['day-tomorrow', 'day-fri', 'day-sat']) {
      expect(screen.getByTestId(id).props.accessibilityState?.selected).toBe(
        false,
      );
    }

    // single-select: picking Amanhã deselects Hoje
    await act(async () => {
      fireEvent.press(screen.getByTestId('day-tomorrow'));
    });
    expect(
      screen.getByTestId('day-tomorrow').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('day-today').props.accessibilityState?.selected,
    ).toBe(false);

    // no "+" custom-date chip and no time-of-day control on the screen
    expect(screen.queryByText('+')).toBeNull();
    expect(screen.queryByText(/hor[áa]rio/i)).toBeNull();
  });

  // --------------------------------------------------------- FORMATO / NÍVEL
  /**
   * Covers: S11 — Create Match
   * Criterion: "FORMATO defaults to 6x6 selected, single-select; NÍVEL defaults to
   *  Intermediário selected, single-select."
   */
  it('defaults FORMATO to 6x6 and NÍVEL to Intermediário, both single-select', async () => {
    await renderScreen();

    expect(
      screen.getByTestId('format-6X6').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('format-2X2').props.accessibilityState?.selected,
    ).toBe(false);
    expect(
      screen.getByTestId('format-4X4').props.accessibilityState?.selected,
    ).toBe(false);

    expect(
      screen.getByTestId('level-INTERMEDIARIO').props.accessibilityState
        ?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('level-INICIANTE').props.accessibilityState?.selected,
    ).toBe(false);
    expect(
      screen.getByTestId('level-AVANCADO').props.accessibilityState?.selected,
    ).toBe(false);

    // single-select FORMATO
    await act(async () => {
      fireEvent.press(screen.getByTestId('format-2X2'));
    });
    expect(
      screen.getByTestId('format-2X2').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('format-6X6').props.accessibilityState?.selected,
    ).toBe(false);

    // single-select NÍVEL
    await act(async () => {
      fireEvent.press(screen.getByTestId('level-AVANCADO'));
    });
    expect(
      screen.getByTestId('level-AVANCADO').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('level-INTERMEDIARIO').props.accessibilityState
        ?.selected,
    ).toBe(false);
  });

  // --------------------------------------------------------------- TIPO
  /**
   * Covers: S11 — Create Match
   * Criterion: "TIPO defaults to 'Avulso' selected (type: 'OneOff'), single-select
   *  between Avulso / Recorrente; the chosen type is included in the submit payload."
   */
  it('defaults TIPO to Avulso (OneOff), single-selects, and carries the chosen type into the payload', async () => {
    await renderScreen();

    expect(
      screen.getByTestId('type-OneOff').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('type-Recurring').props.accessibilityState?.selected,
    ).toBe(false);

    // pick Recorrente -> single-select
    await act(async () => {
      fireEvent.press(screen.getByTestId('type-Recurring'));
    });
    expect(
      screen.getByTestId('type-Recurring').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('type-OneOff').props.accessibilityState?.selected,
    ).toBe(false);

    await fillRequired();
    await submit();
    expect(mockCreate.mutate.mock.calls[0]?.[0]).toMatchObject({
      type: 'Recurring',
    });
  });

  // --------------------------------------------------------- VAGAS & VALOR
  /**
   * Covers: S11 — Create Match
   * Criterion: "'Jogadores' stepper defaults to 12 and enforces a minimum of 2."
   */
  it('defaults Jogadores to 12 and clamps at the minimum of 2', async () => {
    await renderScreen();

    expect(screen.getByTestId('players-stepper').props.children).toEqual([
      '',
      12,
    ]);

    // decrementing from 12 ten times would reach 2 then clamp (min=2)
    for (let i = 0; i < 12; i += 1) {
      await act(async () => {
        fireEvent.press(screen.getByTestId('players-stepper-decrement'));
      });
    }
    expect(screen.getByTestId('players-stepper').props.children).toEqual([
      '',
      2,
    ]);
  });

  /**
   * Covers: S11 — Create Match
   * Criterion: "'Valor / pessoa' accepts 0 (Grátis) and positive values."
   */
  it('lets the price be 0 (Grátis) and increment to a positive value', async () => {
    await renderScreen();

    // default 0, with "R$ " prefix
    expect(screen.getByTestId('price-stepper').props.children).toEqual([
      'R$ ',
      0,
    ]);

    // cannot go below 0 (min=0)
    await act(async () => {
      fireEvent.press(screen.getByTestId('price-stepper-decrement'));
    });
    expect(screen.getByTestId('price-stepper').props.children).toEqual([
      'R$ ',
      0,
    ]);

    // increments to a positive value
    await act(async () => {
      fireEvent.press(screen.getByTestId('price-stepper-increment'));
    });
    expect(screen.getByTestId('price-stepper').props.children).toEqual([
      'R$ ',
      1,
    ]);
  });

  // --------------------------------------------------- CONFIRMAÇÕES ABREM
  /**
   * Covers: S11 — Create Match
   * Criterion: "CONFIRMAÇÕES ABREM defaults to '24h antes' selected
   *  (confirmationOpensHoursBefore: 24), single-select among 48h/24h/12h/6h; the
   *  chosen value is included in the submit payload."
   */
  it('defaults CONFIRMAÇÕES to 24h, single-selects, and carries the chosen value into the payload', async () => {
    await renderScreen();

    expect(
      screen.getByTestId('confirm-24').props.accessibilityState?.selected,
    ).toBe(true);
    for (const id of ['confirm-48', 'confirm-12', 'confirm-6']) {
      expect(screen.getByTestId(id).props.accessibilityState?.selected).toBe(
        false,
      );
    }

    // pick 6h -> single-select
    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-6'));
    });
    expect(
      screen.getByTestId('confirm-6').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('confirm-24').props.accessibilityState?.selected,
    ).toBe(false);

    await fillRequired();
    await submit();
    expect(mockCreate.mutate.mock.calls[0]?.[0]).toMatchObject({
      confirmationOpensHoursBefore: 6,
    });
  });

  // ----------------------------------------------------------- PRIVACIDADE
  /**
   * Covers: S11 — Create Match
   * Criterion: "'Partida aberta' toggle reflects and updates isOpen (default off)."
   */
  it('defaults the Partida aberta toggle off and updates isOpen when toggled', async () => {
    await renderScreen();

    const toggle = screen.getByTestId('open-toggle');
    expect(toggle.props.value).toBe(false);

    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });
    expect(screen.getByTestId('open-toggle').props.value).toBe(true);

    await fillRequired();
    await submit();
    expect(mockCreate.mutate.mock.calls[0]?.[0]).toMatchObject({
      isOpen: true,
    });
  });

  // --------------------------------------------------- submit (full payload)
  /**
   * Covers: S11 — Create Match
   * Criterion: "Tapping 'Criar partida' with valid input calls useCreateMatch
   *  (mocked) with a payload containing name, location, day, format, level, type,
   *  players, price, confirmationOpensHoursBefore, isOpen ... then renders the
   *  'PARTIDA CRIADA!' success screen."
   */
  it('submits the full default payload and renders the PARTIDA CRIADA! success screen', async () => {
    await renderScreen();
    await fillRequired();
    await submit();

    expect(mockCreate.mutate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mutate.mock.calls[0]?.[0]).toMatchObject({
      name: 'Racha de Quinta',
      location: 'Arena Central',
      day: 'today',
      format: '6X6',
      level: 'INTERMEDIARIO',
      type: 'OneOff',
      players: 12,
      price: 0,
      confirmationOpensHoursBefore: 24,
      isOpen: false,
    });

    // success screen replaces the form
    expect(screen.getByText('Partida criada!')).toBeTruthy();
    expect(screen.queryByTestId('create-submit')).toBeNull();
  });

  /**
   * Covers: S11 — Create Match
   * Criterion: "shows the Button loading state" while the mutation is pending.
   */
  it('shows the CTA loading state while the mutation is pending', async () => {
    mockCreate.isPending = true;
    await renderScreen();

    const cta = screen.getByTestId('create-submit');
    expect(cta.props.accessibilityState?.busy).toBe(true);
    expect(cta.props.accessibilityState?.disabled).toBe(true);
  });

  // -------------------------------------------------------- success CTAs
  /**
   * Covers: S11 — Create Match
   * Criterion: "Success 'Ver a partida criada' navigates to S12 (/matches/[id])
   *  with the new id."
   */
  it('routes "Ver a partida criada" to /matches/[id] with the new id', async () => {
    mockCreate.resultId = 'mock-match-42';
    await renderScreen();
    await fillRequired();
    await submit();

    await act(async () => {
      fireEvent.press(screen.getByTestId('created-view-match'));
    });
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/matches/[id]',
      params: { id: 'mock-match-42' },
    });
  });

  /**
   * Covers: S11 — Create Match
   * Criterion: "Success 'Convidar jogadores' navigates to S12 (/matches/[id]) with
   *  the new id (definitive — not disabled)."
   */
  it('routes "Convidar jogadores" to /matches/[id] with the new id', async () => {
    mockCreate.resultId = 'mock-match-7';
    await renderScreen();
    await fillRequired();
    await submit();

    await act(async () => {
      fireEvent.press(screen.getByTestId('created-invite'));
    });
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/matches/[id]',
      params: { id: 'mock-match-7' },
    });
  });

  /**
   * Covers: S11 — Create Match
   * Criterion: "Success 'Voltar ao início' navigates to Home (/(tabs))."
   */
  it('routes "Voltar ao início" to /(tabs)', async () => {
    await renderScreen();
    await fillRequired();
    await submit();

    await act(async () => {
      fireEvent.press(screen.getByTestId('created-home'));
    });
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  // ------------------------------------------------------- error / retry
  /**
   * Covers: S11 — Create Match
   * Criterion: "A failed (mock-forced) create shows the inline retryable error and
   *  re-enables the button."
   */
  it('shows an inline retryable error and re-enables the button on a failed create', async () => {
    mockCreate.behavior = 'reject';
    mockCreate.isError = true;
    await renderScreen();
    await fillRequired();
    await submit();

    expect(mockCreate.mutate).toHaveBeenCalledTimes(1);
    // stays on the form (no success screen)
    expect(screen.queryByText('Partida criada!')).toBeNull();

    const err = screen.getByText('Não foi possível criar a partida. Tente novamente.');
    expect(err.props.accessibilityLiveRegion).toBe('polite');

    // the CTA is re-enabled (not pending) so the user can retry
    const cta = screen.getByTestId('create-submit');
    expect(cta.props.accessibilityState?.disabled).toBe(false);
  });
});
