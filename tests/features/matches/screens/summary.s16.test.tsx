/**
 * S16 — Match Summary screen tests.
 * Covers every acceptance criterion from docs/specs/S16-match-summary.md.
 *
 * The summary read hook (`useMatchSummary`) is MOCKED at the boundary (same
 * posture as the S15 mvp-vote test — the hook itself ships fully mocked this
 * iteration). Navigation (`router.back` / `router.replace`) and the react-native
 * core `Share` are spied at runtime, matching the repo's MatchDetailScreen
 * "spy Linking/Share" convention. NativeWind `className` is asserted directly
 * for the token-mapping criteria (win = accent, loss = danger, font-display, etc.).
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import type { MatchSummary } from '@/features/matches/api/getMatchSummary';

// --- Mocks ----------------------------------------------------------------

// lucide icons -> plain Views tagged with a stable testID (icon-<name>).
jest.mock('lucide-react-native', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => (props: any) =>
    ReactLocal.createElement(View, { ...props, testID: `icon-${name}` });
  return {
    ChevronLeft: stub('chevron-left'),
    MapPin: stub('map-pin'),
    Share2: stub('share2'),
    Trophy: stub('trophy'),
    Plus: stub('plus'),
    Minus: stub('minus'),
  };
});

// expo-router: spyable back / replace + injectable params.
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = { id: 'mine-1' };
jest.mock('expo-router', () => ({
  router: {
    back: (...args: any[]) => mockBack(...args),
    replace: (...args: any[]) => mockReplace(...args),
  },
  useLocalSearchParams: () => mockParams,
}));

// Avatar -> a Text node echoing the name, so MVP-card / ranking-row avatars are
// assertable without pulling in expo-image.
jest.mock('@/components/ui/Avatar', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return {
    Avatar: ({ name }: any) => ReactLocal.createElement(Text, null, `Avatar-${name}`),
  };
});

// Button -> a Pressable that surfaces variant (data-variant) and forwards
// onPress/testID/disabled + accessibilityRole=button.
jest.mock('@/components/ui/Button', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID, disabled, variant }: any) =>
      ReactLocal.createElement(
        Pressable,
        {
          onPress,
          testID,
          disabled: Boolean(disabled),
          accessibilityRole: 'button',
          accessibilityState: { disabled: Boolean(disabled) },
          'data-variant': variant,
        },
        ReactLocal.createElement(Text, null, children),
      ),
  };
});

// auth store: current user id (drives the "· você" ranking highlight).
let mockUserId: string | undefined = 'me';
jest.mock('@/stores/auth', () => ({
  useAuthStore: (selector: any) => selector({ userId: mockUserId }),
}));

// Summary read hook mocked at the boundary. matchSummaryQueryKey is kept real so
// the error-retry path invalidates the correct key.
const mockUseMatchSummary = jest.fn();
jest.mock('@/features/matches/api/getMatchSummary', () => ({
  useMatchSummary: (...args: any[]) => mockUseMatchSummary(...args),
  matchSummaryQueryKey: (matchId: string) => ['matches', matchId, 'summary'],
}));

// --- Runtime imports (after mocks) ----------------------------------------

import { Share } from 'react-native';

import MatchSummaryScreen from '../../../../app/matches/[id]/summary';

// --- Fixtures -------------------------------------------------------------

function winFixture(over: Partial<MatchSummary> = {}): MatchSummary {
  return {
    format: '6X6',
    result: 'VITORIA',
    name: 'Vôlei de Quinta',
    venue: 'Arena Pinheiros',
    dateLabel: '10 jun 2026',
    finalScore: [3, 1],
    setScores: [
      [25, 19],
      [23, 25],
      [25, 21],
      [25, 18],
    ],
    mvp: {
      id: 'o2',
      name: 'Érica Moraes',
      handle: 'erica.vbs',
      position: 'CEN',
      avatarUrl: undefined,
      votes: 5,
    },
    totalVotes: 10,
    voteRanking: [
      { id: 'o2', name: 'Érica Moraes', handle: 'erica.vbs', position: 'CEN', avatarUrl: undefined, votes: 5 },
      { id: 'o3', name: 'Caio Drumond', handle: 'caio_op', position: 'OPO', avatarUrl: undefined, votes: 3 },
      { id: 'o5', name: 'Manu Castro', handle: 'manu_pon', position: 'PON', avatarUrl: undefined, votes: 2 },
    ],
    maxVotes: 5,
    ...over,
  };
}

function lossFixture(over: Partial<MatchSummary> = {}): MatchSummary {
  return winFixture({
    result: 'DERROTA',
    name: 'Racha do Sábado',
    venue: 'Quadra Central',
    dateLabel: '13 jun 2026',
    finalScore: [1, 3],
    ...over,
  });
}

// --- Helpers --------------------------------------------------------------

const wins = (over?: Partial<MatchSummary>) =>
  mockUseMatchSummary.mockReturnValue({ isPending: false, isError: false, data: winFixture(over) });

type JsonNode = { props?: Record<string, any>; children?: any } | null | string;

/** Collect every rendered node whose className contains `sub` (walks toJSON). */
function allByClassName(sub: string): Array<{ props: Record<string, any>; children: any[] }> {
  const out: Array<{ props: Record<string, any>; children: any[] }> = [];
  const walk = (node: JsonNode) => {
    if (!node || typeof node === 'string') return;
    const props = node.props ?? {};
    if (typeof props.className === 'string' && props.className.includes(sub)) {
      out.push({ props, children: ([] as any[]).concat(node.children ?? []) });
    }
    ([] as any[]).concat(node.children ?? []).forEach(walk);
  };
  ([] as any[]).concat(screen.toJSON() as any).forEach(walk);
  return out;
}

/** Recursively concatenate all string leaves of a JSON node. */
function textOf(node: any): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  return ([] as any[]).concat(node.children ?? []).map(textOf).join('');
}

function widthOf(node: { props: Record<string, any> }): string | number | undefined {
  const style = node.props.style;
  const arr = Array.isArray(style) ? style : [style];
  const found = arr.find((s: any) => s && s.width != null);
  return found?.width;
}

// --- Setup ----------------------------------------------------------------

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

async function renderScreen() {
  await act(async () => {
    render(<MatchSummaryScreen />, { wrapper });
  });
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mockParams = { id: 'mine-1' };
  mockUserId = 'me';
  mockUseMatchSummary.mockReset();
  wins(); // default: populated win summary
  mockBack.mockClear();
  mockReplace.mockClear();
  jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
});

afterEach(() => {
  cleanup();
});

// --------------------------------------------------------------------------

describe('S16 — Match Summary', () => {
  /**
   * Covers: S16 — Match Summary
   * Criterion: "Header shows back chevron, 'Resumo da partida' title, and a share
   *  icon button" + "Accessibility: back/share expose role=button + labels".
   */
  it('renders the header (back chevron, title, share icon) with a11y roles/labels', async () => {
    await renderScreen();

    const back = screen.getByLabelText('Voltar');
    expect(back.props.accessibilityRole).toBe('button');
    expect(screen.getByTestId('icon-chevron-left')).toBeTruthy();

    expect(screen.getByText('Resumo da partida')).toBeTruthy();

    const share = screen.getByLabelText('Compartilhar resumo');
    expect(share.props.accessibilityRole).toBe('button');
    expect(screen.getByTestId('icon-share2')).toBeTruthy();
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "back chevron -> router.back()".
   */
  it('calls router.back() from the back chevron', async () => {
    await renderScreen();
    fireEvent.press(screen.getByLabelText('Voltar'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "Result header shows a format pill (e.g. '6X6') and a
   *  Vitória/Derrota pill (Vitória = lime accent, Derrota = danger)."
   */
  it('renders the format pill and a lime Vitória pill for a win', async () => {
    await renderScreen();

    expect(screen.getByText('6X6')).toBeTruthy();

    const winLabel = screen.getByText('Vitória');
    // dark text on the lime pill (DESIGN_SYSTEM contrast rule)
    expect(winLabel.props.className).toContain('text-text-primary');
    // pill container filled with accent (lime)
    expect(winLabel.parent?.props.className).toContain('bg-accent');
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "Vitória/Derrota pill (... Derrota = danger)."
   */
  it('renders a danger Derrota pill for a loss', async () => {
    mockUseMatchSummary.mockReturnValue({ isPending: false, isError: false, data: lossFixture() });
    await renderScreen();

    const lossLabel = screen.getByText('Derrota');
    expect(lossLabel.props.className).toContain('text-text-on-dark');
    expect(lossLabel.parent?.props.className).toContain('bg-danger');
    expect(screen.queryByText('Vitória')).toBeNull();
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "Match name renders in Climate Crisis uppercase (text-display)."
   */
  it('renders the match name in font-display uppercase', async () => {
    await renderScreen();
    const name = screen.getByText('Vôlei de Quinta');
    expect(name.props.className).toContain('font-display');
    expect(name.props.className).toContain('uppercase');
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "'Venue · date' line renders with a MapPin icon (text-muted)."
   */
  it('renders the venue · date line with a MapPin icon', async () => {
    await renderScreen();
    expect(screen.getByText('Arena Pinheiros · 10 jun 2026')).toBeTruthy();
    expect(screen.getByTestId('icon-map-pin')).toBeTruthy();
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "Final set score renders large in font-num (e.g. '3–1')."
   */
  it('renders the final set score in font-num', async () => {
    await renderScreen();
    const score = screen.getByText('3–1'); // en-dash, per the screen
    expect(score.props.className).toContain('font-num');
    expect(score.props.style).toEqual(expect.objectContaining({ fontSize: 56 }));
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "Per-set score pills render exactly setScores.length items
   *  (e.g. 25-19, 23-25, 25-21, 25-18)."
   */
  it('renders exactly setScores.length per-set pills (data-driven)', async () => {
    await renderScreen();

    expect(screen.getByText('25-19')).toBeTruthy();
    expect(screen.getByText('23-25')).toBeTruthy();
    expect(screen.getByText('25-21')).toBeTruthy();
    expect(screen.getByText('25-18')).toBeTruthy();
    expect(allByClassName('rounded-chip')).toHaveLength(4);
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "Per-set score pills render exactly setScores.length items" — the
   *  count is data-driven (a 2-set match renders 2 pills, not a fixed 4).
   */
  it('renders a data-driven number of per-set pills (2-set match -> 2 pills)', async () => {
    mockUseMatchSummary.mockReturnValue({
      isPending: false,
      isError: false,
      data: winFixture({ setScores: [[25, 20], [25, 22]], finalScore: [2, 0] }),
    });
    await renderScreen();

    expect(allByClassName('rounded-chip')).toHaveLength(2);
    expect(screen.getByText('25-20')).toBeTruthy();
    expect(screen.getByText('25-22')).toBeTruthy();
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "'MVP MAIS VOTADO' section shows the top-voted player in a
   *  lime-bordered highlight card with avatar, name, @handle · position, and
   *  'N de M votos'."
   */
  it('renders the MVP highlight card with avatar, name, handle·position, and N de M votos', async () => {
    await renderScreen();

    expect(screen.getByText('MVP mais votado')).toBeTruthy();
    expect(screen.getByTestId('icon-trophy')).toBeTruthy();

    // lime-bordered highlight card
    expect(allByClassName('border-accent').length).toBeGreaterThan(0);

    // avatar + name appear in the card (name also repeats in ranking row 1)
    expect(screen.getAllByText('Avatar-Érica Moraes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Érica Moraes').length).toBeGreaterThan(0);
    // @handle · position is unique to the MVP card
    expect(screen.getByText('@erica.vbs · CEN')).toBeTruthy();

    // "N de M votos" (denominator = totalVotes)
    expect(screen.getByText('de 10 votos')).toBeTruthy();
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "Vote ranking lists top-voted players with position number, avatar,
   *  name, a proportional lime vote bar, and vote count."
   */
  it('renders the vote ranking with names, counts, and proportional lime bars', async () => {
    await renderScreen();

    // names (Érica also appears in the MVP card above -> getAllByText)
    expect(screen.getAllByText('Érica Moraes').length).toBeGreaterThan(0);
    expect(screen.getByText('Caio Drumond')).toBeTruthy();
    expect(screen.getByText('Manu Castro')).toBeTruthy();

    // avatars for every ranking row
    expect(screen.getAllByText('Avatar-Caio Drumond').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Avatar-Manu Castro').length).toBeGreaterThan(0);

    // position numbers (muted, w-4) — 1 / 2 / 3 render as their own nodes
    const positions = allByClassName('text-text-muted w-4').map(textOf);
    expect(positions).toEqual(['1', '2', '3']);

    // vote counts render (numbers can repeat across positions/counts, so assert presence)
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);

    // proportional lime fills: 5/5 -> 100%, 3/5 -> 60%, 2/5 -> 40%
    const fills = allByClassName('bg-accent').filter((n: any) => widthOf(n) != null);
    expect(fills.map(widthOf)).toEqual(['100%', '60%', '40%']);
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: (State) current user in the ranking is flagged with a "· você" tag.
   */
  it('flags the current user in the ranking with a "· você" tag', async () => {
    mockUserId = 'o3'; // Caio Drumond is the viewer
    await renderScreen();
    expect(screen.getByText(/· você/)).toBeTruthy();
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: (Empty edge) "if voteRanking is empty ... hide the 'MVP mais votado'
   *  section and show 'Sem votação de MVP nesta partida'. Header + score always render."
   */
  it('hides the MVP section and shows the empty caption when there is no voting', async () => {
    mockUseMatchSummary.mockReturnValue({
      isPending: false,
      isError: false,
      data: winFixture({ voteRanking: [], maxVotes: 0, totalVotes: 0 }),
    });
    await renderScreen();

    expect(screen.getByText('Sem votação de MVP nesta partida')).toBeTruthy();
    expect(screen.queryByText('MVP mais votado')).toBeNull();
    // result header + score still render
    expect(screen.getByText('Vôlei de Quinta')).toBeTruthy();
    expect(screen.getByText('3–1')).toBeTruthy();
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "Share button opens the OS share sheet (text only) via Share.share."
   */
  it('opens the OS share sheet (text only) via Share.share', async () => {
    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Compartilhar resumo'));
    });

    expect(Share.share).toHaveBeenCalledTimes(1);
    expect((Share.share as jest.Mock).mock.calls[0][0]).toEqual({
      message: 'Vôlei de Quinta — Vitória 3–1. MVP: Érica Moraes.',
    });
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "No 'MEU DESEMPENHO' block, no XP-gained pill, no
   *  Pontos/Blocks/Defesas/Aces cards are present (Layer-3 cut verified)."
   */
  it('does NOT render the MEU DESEMPENHO block, XP pill, or stat cards', async () => {
    await renderScreen();

    expect(screen.queryByText(/MEU DESEMPENHO/i)).toBeNull();
    expect(screen.queryByText(/XP/i)).toBeNull();
    expect(screen.queryByText(/Pontos/i)).toBeNull();
    expect(screen.queryByText(/Blocks/i)).toBeNull();
    expect(screen.queryByText(/Defesas/i)).toBeNull();
    expect(screen.queryByText(/Aces/i)).toBeNull();
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "No per-player stats input screen/form is reachable from S16."
   */
  it('does NOT expose any per-player stats input / stepper controls', async () => {
    await renderScreen();

    expect(screen.queryByText(/Confirmar estatísticas/i)).toBeNull();
    expect(screen.queryByTestId('icon-plus')).toBeNull();
    expect(screen.queryByTestId('icon-minus')).toBeNull();
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "'Voltar para o perfil' navigates to the Profile tab (S8) and
   *  resets the match stack." (router.replace('/(tabs)/profile'))
   */
  it('navigates to the Profile tab (replace) from the bottom CTA', async () => {
    await renderScreen();

    const cta = screen.getByTestId('summary-back-to-profile');
    expect(cta.props['data-variant']).toBe('grad');
    expect(cta.props.accessibilityRole).toBe('button');

    fireEvent.press(cta);
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/profile');
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "Summary loads via useMatchSummary(matchId) (mocked)."
   */
  it('loads the summary via useMatchSummary(matchId) with the route id', async () => {
    mockParams = { id: 'near-1' };
    await renderScreen();
    expect(mockUseMatchSummary).toHaveBeenCalledWith('near-1');
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "Loading shows skeletons ..."
   */
  it('renders the loading skeleton while the query is pending', async () => {
    mockUseMatchSummary.mockReturnValue({ isPending: true, isError: false, data: undefined });
    await renderScreen();

    // header stays; populated content + CTA are absent during loading
    expect(screen.getByText('Resumo da partida')).toBeTruthy();
    expect(screen.queryByText('Vôlei de Quinta')).toBeNull();
    expect(screen.queryByText('3–1')).toBeNull();
    expect(screen.queryByTestId('summary-back-to-profile')).toBeNull();
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "... load failure shows a recoverable error with 'Tentar novamente'."
   */
  it('renders a recoverable error state and invalidates the query on retry', async () => {
    mockUseMatchSummary.mockReturnValue({ isPending: false, isError: true, data: undefined });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await renderScreen();

    expect(screen.getByText('Não foi possível carregar o resumo')).toBeTruthy();

    fireEvent.press(screen.getByTestId('summary-retry'));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['matches', 'mine-1', 'summary'] });
  });

  /**
   * Covers: S16 — Match Summary
   * Criterion: "Accessibility: ... the result is announced." (single a11y label
   *  summarising Vitória/Derrota, placar, MVP on the result region) + CTA role.
   */
  it('announces the result region via a single accessibilityLabel', async () => {
    await renderScreen();

    expect(
      screen.getByLabelText('Vitória, placar 3 a 1, MVP Érica Moraes'),
    ).toBeTruthy();
  });
});
