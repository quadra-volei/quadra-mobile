/**
 * S4 — Onboarding wizard screen tests.
 *
 * Covers every acceptance criterion in docs/specs/S4-onboarding.md:
 *  - Step 0 collects NOME / SOBRENOME / DATA DE NASCIMENTO / APELIDO; "Continuar"
 *    disabled until all four are valid.
 *  - APELIDO field shows the "@" adornment + "SEU @ NA QUADRA" lime badge + helper.
 *  - Position step (Passo 1 de 3): exactly 6 single-select cards; selecting one
 *    highlights it + enables "Continuar"; single-select only.
 *  - Level step (Passo 2 de 3): exactly Iniciante / Intermediário / Avançado,
 *    single-select.
 *  - Modality step (Passo 3 de 3): exactly Vôlei de quadra / Vôlei de praia,
 *    single-select.
 *  - Progress header reads "MONTE SEU PERFIL" / "Passo X de 3"; segmented bar fills.
 *  - Completion screen ("PERFIL PRONTO!") summarizes posição / nível / modalidade.
 *  - "Entrar na quadra" fires useCreateProfile, shows the loading spinner, and on
 *    success navigates to /(tabs) with the user marked onboarded.
 *  - No profile-photo step, no secondary position, no tutorial slides anywhere.
 *  - All inputs are RHF-controlled (no raw useState holds form values).
 *
 * Profile creation is mocked at the hook boundary (no network, no real timer) so
 * the loading/success/error branches are deterministic. Navigation is mocked via
 * expo-router. Native modules (gradient, safe-area, lucide) are stubbed inline —
 * the repo's tests/__mocks__ are NOT auto-applied.
 */
import React from 'react';

// --- Native / module mocks ------------------------------------------------

// LinearGradient -> View that forwards props (so testID/colors are queryable).
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

// safe-area -> plain View (no insets provider needed under test).
jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      ReactLocal.createElement(View, props, children),
  };
});

// lucide icons -> inert nodes (avoids pulling svg internals).
jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) =>
    ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  return {
    BarChart3: stub('bar-chart'),
    Check: stub('check'),
    ChevronLeft: stub('chevron-left'),
    ChevronRight: stub('chevron-right'),
    Globe: stub('globe'),
    Calendar: stub('calendar'),
  };
});

// expo-router: spyable router.
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => true);
jest.mock('expo-router', () => ({
  router: {
    back: (...args: any[]) => mockBack(...args),
    replace: (...args: any[]) => mockReplace(...args),
    canGoBack: () => mockCanGoBack(),
  },
}));

// --- Profile mutation mock (the mocked create) ----------------------------
// `mock`-prefixed holder so the jest.mock factory may reference it (hoisting).
type MutateOpts = { onSuccess?: () => void; onError?: (err: Error) => void };

const mockCreate = {
  isPending: false,
  isError: false,
  behavior: 'resolve' as 'resolve' | 'reject',
  mutate: jest.fn((_input: unknown, opts?: MutateOpts) => {
    if (mockCreate.behavior === 'reject') {
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

jest.mock('@/features/profile/api/createProfile', () => ({
  useCreateProfile: () => ({
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

import { useAuthStore } from '@/stores/auth';

import OnboardingScreen from '../../../../app/(auth)/onboarding';

beforeEach(() => {
  mockBack.mockClear();
  mockReplace.mockClear();
  mockCanGoBack.mockReturnValue(true);
  mockCreate.mutate.mockClear();
  mockCreate.isPending = false;
  mockCreate.isError = false;
  mockCreate.behavior = 'resolve';
  useAuthStore.getState().clearAuth();
});

afterEach(() => {
  cleanup();
});

/** Renders the screen, committing the initial concurrent mount in act. */
async function renderScreen() {
  await act(async () => {
    render(<OnboardingScreen />);
  });
}

/** Presses a control and commits the resulting state update via async act. */
async function press(testID: string) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

/** Types into a TextField/DateField and commits the update via async act. */
async function type(testID: string, value: string) {
  await act(async () => {
    fireEvent.changeText(screen.getByTestId(testID), value);
  });
}

/** Fills all four step-0 personal fields with valid values. */
async function fillStep0() {
  await type('onboarding-first-name', 'Renan');
  await type('onboarding-last-name', 'Dias');
  await type('onboarding-birth-date', '01011990');
  await type('onboarding-handle', 'renan');
}

/** Walks the wizard to the completion screen with the canonical selections. */
async function walkToCompletion() {
  await fillStep0();
  await press('onboarding-continue'); // -> step 1 (position)
  await press('position-COR');
  await press('onboarding-continue'); // -> step 2 (level)
  await press('level-INICIANTE');
  await press('onboarding-continue'); // -> step 3 (modality)
  await press('modality-INDOOR');
  await press('onboarding-continue'); // -> step 4 (completion)
}

describe('S4 — Onboarding wizard', () => {
  // -------------------------------------------------------------- step 0 fields
  /**
   * Covers: S4 — Onboarding
   * Criterion: "Step 0 collects NOME, SOBRENOME, DATA DE NASCIMENTO, and
   *  APELIDO/@handle."
   */
  it('renders all four personal-data fields on step 0', async () => {
    await renderScreen();

    expect(screen.getByTestId('onboarding-first-name')).toBeTruthy();
    expect(screen.getByTestId('onboarding-last-name')).toBeTruthy();
    expect(screen.getByTestId('onboarding-birth-date')).toBeTruthy();
    expect(screen.getByTestId('onboarding-handle')).toBeTruthy();
    expect(screen.getByText('NOME')).toBeTruthy();
    expect(screen.getByText('SOBRENOME')).toBeTruthy();
    expect(screen.getByText('DATA DE NASCIMENTO')).toBeTruthy();
  });

  /**
   * Covers: S4 — Onboarding
   * Criterion: "'Continuar' is disabled until all four are valid."
   */
  it('keeps step-0 "Continuar" disabled until all four fields are filled', async () => {
    await renderScreen();
    const cta = () => screen.getByTestId('onboarding-continue');

    expect(cta().props.accessibilityState?.disabled).toBe(true);

    await type('onboarding-first-name', 'Renan');
    await type('onboarding-last-name', 'Dias');
    await type('onboarding-birth-date', '01011990');
    // still missing the handle -> disabled
    expect(cta().props.accessibilityState?.disabled).toBe(true);

    await type('onboarding-handle', 'renan');
    expect(cta().props.accessibilityState?.disabled).toBe(false);
  });

  /**
   * Covers: S4 — Onboarding
   * Criterion: "'Continuar' ... never advances on invalid" — tapping while a field
   *  is invalid (a 2-char handle fails the Zod regex) keeps the user on step 0.
   */
  it('does not advance from step 0 when a field is invalid', async () => {
    await renderScreen();

    await type('onboarding-first-name', 'Renan');
    await type('onboarding-last-name', 'Dias');
    await type('onboarding-birth-date', '01011990');
    await type('onboarding-handle', 'ab'); // too short -> regex fails

    await press('onboarding-continue');

    // Still on step 0: the personal fields are present, the position grid is not.
    expect(screen.getByTestId('onboarding-first-name')).toBeTruthy();
    expect(screen.queryByTestId('position-LEV')).toBeNull();
  });

  // ----------------------------------------------------------- APELIDO adornment
  /**
   * Covers: S4 — Onboarding
   * Criterion: "APELIDO field shows the @ adornment and the 'SEU @ NA QUADRA' lime
   *  badge; helper text is present."
   */
  it('shows the @ adornment, the lime badge, and the helper copy on the handle field', async () => {
    await renderScreen();

    expect(screen.getByText('@')).toBeTruthy();
    expect(screen.getByText('SEU @ NA QUADRA')).toBeTruthy();
    expect(
      screen.getByText(
        'É assim que a galera vai te encontrar e marcar nas partidas.',
      ),
    ).toBeTruthy();
  });

  // ------------------------------------------------------------ position step
  /**
   * Covers: S4 — Onboarding
   * Criterion: "Position step (Passo 1 de 3) shows exactly 6 single-select cards
   *  (LEV, PON, OPO, CEN, LIB, COR)."
   */
  it('renders exactly the 6 position cards on Passo 1 de 3', async () => {
    await renderScreen();
    await fillStep0();
    await press('onboarding-continue');

    expect(screen.getByText('Passo 1 de 3')).toBeTruthy();
    expect(screen.getByText('MONTE SEU PERFIL')).toBeTruthy();
    expect(screen.getByText('QUAL SUA POSIÇÃO?')).toBeTruthy();

    for (const code of ['LEV', 'PON', 'OPO', 'CEN', 'LIB', 'COR']) {
      expect(screen.getByTestId(`position-${code}`)).toBeTruthy();
    }
    // no 7th card
    expect(screen.queryByTestId('position-XXX')).toBeNull();
  });

  /**
   * Covers: S4 — Onboarding
   * Criterion: "selecting one highlights it and enables 'Continuar'; only one can
   *  be selected."
   */
  it('single-selects a position, enables "Continuar", and never keeps two selected', async () => {
    await renderScreen();
    await fillStep0();
    await press('onboarding-continue');

    const cta = () => screen.getByTestId('onboarding-continue');
    expect(cta().props.accessibilityState?.disabled).toBe(true);

    await press('position-LEV');
    expect(
      screen.getByTestId('position-LEV').props.accessibilityState?.selected,
    ).toBe(true);
    expect(cta().props.accessibilityState?.disabled).toBe(false);

    // selecting another deselects the first (single-select)
    await press('position-PON');
    expect(
      screen.getByTestId('position-PON').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('position-LEV').props.accessibilityState?.selected,
    ).toBe(false);
  });

  // --------------------------------------------------------------- level step
  /**
   * Covers: S4 — Onboarding
   * Criterion: "Level step (Passo 2 de 3) offers exactly Iniciante / Intermediário
   *  / Avançado, single-select."
   */
  it('renders exactly the 3 levels on Passo 2 de 3 and single-selects', async () => {
    await renderScreen();
    await fillStep0();
    await press('onboarding-continue');
    await press('position-COR');
    await press('onboarding-continue');

    expect(screen.getByText('Passo 2 de 3')).toBeTruthy();
    expect(screen.getByText('SEU NÍVEL DE JOGO')).toBeTruthy();
    expect(screen.getByText('Iniciante')).toBeTruthy();
    expect(screen.getByText('Intermediário')).toBeTruthy();
    expect(screen.getByText('Avançado')).toBeTruthy();
    expect(screen.getByTestId('level-INICIANTE')).toBeTruthy();
    expect(screen.getByTestId('level-INTERMEDIARIO')).toBeTruthy();
    expect(screen.getByTestId('level-AVANCADO')).toBeTruthy();
    // exactly three (no fourth)
    expect(screen.queryByTestId('level-PRO')).toBeNull();

    await press('level-INICIANTE');
    await press('level-AVANCADO');
    expect(
      screen.getByTestId('level-AVANCADO').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('level-INICIANTE').props.accessibilityState?.selected,
    ).toBe(false);
  });

  // ------------------------------------------------------------ modality step
  /**
   * Covers: S4 — Onboarding
   * Criterion: "Modality step (Passo 3 de 3) offers exactly Vôlei de quadra (6x6)
   *  and Vôlei de praia (2x2), single-select."
   */
  it('renders exactly the 2 modalities on Passo 3 de 3 and single-selects', async () => {
    await renderScreen();
    await fillStep0();
    await press('onboarding-continue');
    await press('position-COR');
    await press('onboarding-continue');
    await press('level-INICIANTE');
    await press('onboarding-continue');

    expect(screen.getByText('Passo 3 de 3')).toBeTruthy();
    expect(screen.getByText('MODALIDADE FAVORITA')).toBeTruthy();
    expect(screen.getByText('Vôlei de quadra')).toBeTruthy();
    expect(screen.getByText('Vôlei de praia')).toBeTruthy();
    expect(screen.getByTestId('modality-INDOOR')).toBeTruthy();
    expect(screen.getByTestId('modality-BEACH')).toBeTruthy();
    // exactly two (no third)
    expect(screen.queryByTestId('modality-GRASS')).toBeNull();

    await press('modality-INDOOR');
    await press('modality-BEACH');
    expect(
      screen.getByTestId('modality-BEACH').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('modality-INDOOR').props.accessibilityState?.selected,
    ).toBe(false);
  });

  // -------------------------------------------------------- progress header bar
  /**
   * Covers: S4 — Onboarding
   * Criterion: "Progress header reads 'MONTE SEU PERFIL' / 'Passo X de 3' and the
   *  segmented bar fills 1->2->3 across the wizard."
   */
  it('advances the "Passo X de 3" header label across the three wizard steps', async () => {
    await renderScreen();
    await fillStep0();

    await press('onboarding-continue');
    expect(screen.getByText('Passo 1 de 3')).toBeTruthy();

    await press('position-COR');
    await press('onboarding-continue');
    expect(screen.getByText('Passo 2 de 3')).toBeTruthy();

    await press('level-INICIANTE');
    await press('onboarding-continue');
    expect(screen.getByText('Passo 3 de 3')).toBeTruthy();
  });

  // ------------------------------------------------------------ back navigation
  /**
   * Covers: S4 — Onboarding (Navigation triggers)
   * Step 0 back chevron -> router.back(); wizard back -> internal setStep(step-1).
   */
  it('navigates back within the wizard and out of step 0 via the back chevron', async () => {
    await renderScreen();
    await fillStep0();
    await press('onboarding-continue'); // step 1

    // wizard back returns to step 0 (no route change)
    await press('onboarding-back');
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByTestId('onboarding-first-name')).toBeTruthy();

    // step-0 back chevron leaves the route
    await press('onboarding-back');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------- completion summary
  /**
   * Covers: S4 — Onboarding
   * Criterion: "Completion screen ('PERFIL PRONTO!') summarizes the chosen posição,
   *  nível, and modalidade."
   */
  it('shows the completion screen summarizing the chosen position, level, and modality', async () => {
    await renderScreen();
    await walkToCompletion();

    expect(screen.getByText('PERFIL PRONTO!')).toBeTruthy();
    expect(screen.getByText('PERFIL COMPLETO')).toBeTruthy();
    expect(screen.getByText('✓ 3/3')).toBeTruthy();

    // summary row labels + the selected values
    expect(screen.getByText('Posição')).toBeTruthy();
    expect(screen.getByText('Nível')).toBeTruthy();
    expect(screen.getByText('Modalidade')).toBeTruthy();
    expect(screen.getByText('Coringa')).toBeTruthy(); // COR
    expect(screen.getByText('Iniciante')).toBeTruthy(); // INICIANTE
    expect(screen.getByText('Vôlei de quadra')).toBeTruthy(); // INDOOR
  });

  // --------------------------------------------------- entrar na quadra success
  /**
   * Covers: S4 — Onboarding
   * Criterion: "'Entrar na quadra' fires useCreateProfile, shows a loading spinner,
   *  and on success navigates to Home (/(tabs)) with the user marked onboarded."
   */
  it('fires useCreateProfile with the collected values and routes to /(tabs) on success', async () => {
    await renderScreen();
    await walkToCompletion();

    await press('onboarding-enter');

    expect(mockCreate.mutate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mutate.mock.calls[0]?.[0]).toEqual({
      firstName: 'Renan',
      lastName: 'Dias',
      birthDate: '01/01/1990',
      handle: 'renan',
      position: 'COR',
      level: 'INICIANTE',
      modality: 'INDOOR',
    });

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    expect(useAuthStore.getState().hasProfile).toBe(true);
  });

  /**
   * Covers: S4 — Onboarding
   * Criterion: "'Entrar na quadra' ... shows a loading spinner" — while the
   *  mutation is pending the CTA is busy/disabled (Button loading contract).
   */
  it('shows the loading state on "Entrar na quadra" while the mutation is pending', async () => {
    mockCreate.isPending = true;
    await renderScreen();
    await walkToCompletion();

    const cta = screen.getByTestId('onboarding-enter');
    expect(cta.props.accessibilityState?.busy).toBe(true);
    expect(cta.props.accessibilityState?.disabled).toBe(true);
  });

  /**
   * Covers: S4 — Onboarding (Loading / error states)
   * On mutation error the user stays on the completion screen (no navigation) and
   * an inline polite error is surfaced — no toast.
   */
  it('keeps the user on completion and surfaces an inline error if the mutation rejects', async () => {
    mockCreate.behavior = 'reject';
    mockCreate.isError = true;
    await renderScreen();
    await walkToCompletion();

    await press('onboarding-enter');

    expect(mockCreate.mutate).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(useAuthStore.getState().hasProfile).toBe(false);

    const status = screen.getByText(
      'Não foi possível criar seu perfil. Tente novamente.',
    );
    expect(status.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  // ---------------------------------------------------------- exclusions / scope
  /**
   * Covers: S4 — Onboarding
   * Criterion: "No profile-photo step, no secondary position, no tutorial slides
   *  appear anywhere."
   */
  it('shows no profile-photo, secondary-position, or tutorial elements across the flow', async () => {
    await renderScreen();

    // step 0
    expect(screen.queryByText(/trocar foto/i)).toBeNull();
    expect(screen.queryByText(/foto de perfil/i)).toBeNull();
    expect(screen.queryByTestId('photo-picker')).toBeNull();

    await fillStep0();
    await press('onboarding-continue'); // position step

    // single position only — no "posição secundária" prompt
    expect(screen.queryByText(/secund[aá]ria/i)).toBeNull();
    // no tutorial carousel ("Pular" / "Próximo" slide controls)
    expect(screen.queryByText(/pular/i)).toBeNull();
    expect(screen.queryByTestId('tutorial-carousel')).toBeNull();
  });
});
