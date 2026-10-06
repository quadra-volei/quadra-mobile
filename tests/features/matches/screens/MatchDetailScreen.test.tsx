/**
 * S12 — Match Detail screen tests (`app/matches/[id].tsx`).
 *
 * Covers every acceptance criterion of docs/specs/S12-match-detail.md:
 *  - reads `id` from useLocalSearchParams; renders via useMatchDetail (mocked);
 *    loading skeleton while pending; error state with retry on failure.
 *  - hero header: back chevron (accessibilityLabel "Voltar" -> router.back), share
 *    icon, format mono pill, level lime pill, match name (font-display/uppercase),
 *    "venue · distance" line.
 *  - white info card: QUANDO / MODO / VAGAS / NÍVEL grid + "Organizado por {name}"
 *    row with the organizer avatar and the position pill (primary token).
 *  - PresenceGrid: avatars + names + dashed "vaga" slots + "CONFIRMADOS · N/M".
 *  - NO per-player OVR rendered (participant + organizer).
 *  - countdown: BOTH branches via the pure formatCountdown (window open ->
 *    "Confirmações fecham em …"; window closed -> "Começa em …").
 *  - participant confirm/decline shown only for REGULAR; tapping confirm calls
 *    useConfirmPresence, shows loading; decline calls useDeclinePresence; a
 *    non-Regular user sees no confirm/decline.
 *  - DropIn join shown only when NOT Regular AND open DropIn slots exist AND window
 *    closed; tapping calls useJoinMatch; otherwise the disabled full/closed CTA.
 *  - variant="grad" for the organizer "Montar os times" and the participant
 *    "Confirmar presença" (the prototype's full-width gradient CTA); the
 *    remaining affirmative CTAs ("Iniciar partida" / "Entrar na partida") use
 *    variant="primary".
 *  - organizer view: "VOCÊ ORGANIZA" badge, "Convidar", team-config block; footer
 *    CTA replaced by "Montar os times".
 *  - team-count chips single-select (default 2); stepper min; draw-mode radio rows
 *    single-select (default Manual) with accessibilityRole="radio" + checked state.
 *  - "Montar os times" -> /matches/[id]/teams carrying { id, teamCount, perTeam,
 *    drawMode }.
 *  - "Convidar" + hero share icon call Share.share (no navigation).
 *  - confirmed avatars are display-only (no navigation on tap).
 *  - no tab bar; no chat UI.
 *
 * useMatchDetail + the three presence hooks are mocked at the boundary so each role
 * and footer branch is deterministic (no network, no MSW). Share / expo-router /
 * native modules are stubbed inline. The Button stub forwards its `variant` and
 * loading/disabled state so the variant-mapping criterion stays queryable. The real
 * useAuthStore (a plain, non-persisted zustand store) drives isOrganizer via
 * setState. The hook-invalidation half of the presence criteria is covered against
 * the real hooks in tests/features/matches/api/presence.test.tsx.
 */
import React from 'react';

// --- Native / module mocks ------------------------------------------------

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
    Calendar: stub('calendar'),
    Check: stub('check'),
    ChevronLeft: stub('chevron-left'),
    Hand: stub('hand'),
    MapPin: stub('map-pin'),
    Play: stub('play'),
    Share2: stub('share2'),
    UserPlus: stub('user-plus'),
    Users: stub('users'),
    Volleyball: stub('volleyball'),
    WandSparkles: stub('wand-sparkles'),
    Zap: stub('zap'),
    Minus: stub('minus'),
    Plus: stub('plus'),
    X: stub('x'),
  };
});

// Button: a plain Pressable that surfaces `variant` (so the grad-vs-primary
// criterion is assertable) and forwards loading/disabled -> accessibilityState.
jest.mock('@/components/ui/Button', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID, loading, disabled, variant, leftIcon }: any) =>
      ReactLocal.createElement(
        Pressable,
        {
          onPress,
          testID,
          disabled: Boolean(loading || disabled),
          accessibilityRole: 'button',
          accessibilityState: {
            busy: Boolean(loading),
            disabled: Boolean(loading || disabled),
          },
          // expose the variant for the token-mapping assertions
          'data-variant': variant,
        },
        [
          leftIcon ?? null,
          ReactLocal.createElement(Text, { key: 'label' }, children),
        ],
      ),
  };
});

// expo-router: spyable router.back / router.push + injectable params.
const mockBack = jest.fn();
const mockPush = jest.fn();
let mockParams: Record<string, string> = { id: 'near-1' };
jest.mock('expo-router', () => ({
  router: {
    back: (...args: any[]) => mockBack(...args),
    push: (...args: any[]) => mockPush(...args),
  },
  useLocalSearchParams: () => mockParams,
}));

// react-native core Share — spied on the barrel export at runtime (the screen
// does `import { Share } from 'react-native'`, so the deep-path module mock does
// not intercept it). Matches the repo's "spy Linking/Share" convention.
const mockShare = jest.fn();

// --- Read/write hook mocks (mocked at the boundary) -----------------------
import type { MatchDetail } from '@/features/matches/types/matchDetail';

const ORGANIZER_USER_ID = 'user-organizer';

function participantFixture(over: Partial<MatchDetail> = {}): MatchDetail {
  return {
    id: 'near-1',
    name: 'Racha de Domingo',
    format: '6X6',
    level: 'INTERMEDIARIO',
    venue: 'Arena Quadra',
    distanceKm: 1.2,
    tint: '#1A1AFF',
    priceLabel: 'R$ 25',
    pricePlan: 'RECORRENTE',
    priceMonthlyLabel: 'R$ 80',
    capacity: 12,
    startsAt: '2026-06-23T22:00:00.000Z',
    confirmationClosesAt: '2026-06-23T19:30:00.000Z',
    confirmationWindowClosed: false,
    organizerId: 'user-erica',
    organizer: {
      id: 'user-erica',
      name: 'Érica Moraes',
      position: 'CEN',
      level: 18,
    },
    players: [
      { id: 'p1', name: 'Renan', status: 'CONFIRMADO', position: 'LEV', level: 15 },
      { id: 'p2', name: 'Bia', status: 'CONFIRMADO', position: 'PON', level: 9 },
      { id: 'p3', name: 'Caio', status: 'CONFIRMADO', position: 'OPO', level: 15 },
    ],
    openDropInSlots: 6,
    myParticipationType: 'REGULAR',
    myStatus: 'PENDENTE',
    teamConfig: { teamCount: 2, perTeam: 6, drawMode: 'MANUAL' },
    ...over,
  };
}

function organizerFixture(over: Partial<MatchDetail> = {}): MatchDetail {
  return participantFixture({
    id: 'mine-1',
    name: 'Sua partida',
    organizerId: ORGANIZER_USER_ID,
    organizer: { id: ORGANIZER_USER_ID, name: 'Você', position: 'LEV' },
    confirmationWindowClosed: true,
    myParticipationType: null,
    myStatus: null,
    teamConfig: { teamCount: 2, perTeam: 4, drawMode: 'MANUAL' },
    ...over,
  });
}

type QueryState = {
  data: MatchDetail | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: jest.Mock;
};

const mockDetail: QueryState = {
  data: participantFixture(),
  isPending: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('@/features/matches/api/getMatchDetail', () => ({
  useMatchDetail: () => ({
    data: mockDetail.data,
    isPending: mockDetail.isPending,
    isError: mockDetail.isError,
    refetch: mockDetail.refetch,
  }),
}));

const mockConfirm = { mutate: jest.fn(), isPending: false };
const mockDecline = { mutate: jest.fn(), isPending: false };
const mockJoin = { mutate: jest.fn(), isPending: false };
const mockAddGuest = { mutate: jest.fn(), isPending: false };

jest.mock('@/features/matches/api/presence', () => ({
  useConfirmPresence: () => ({
    mutate: mockConfirm.mutate,
    isPending: mockConfirm.isPending,
  }),
  useDeclinePresence: () => ({
    mutate: mockDecline.mutate,
    isPending: mockDecline.isPending,
  }),
  useJoinMatch: () => ({
    mutate: mockJoin.mutate,
    isPending: mockJoin.isPending,
  }),
}));

jest.mock('@/features/matches/api/addGuest', () => ({
  useAddGuest: () => ({
    mutate: mockAddGuest.mutate,
    isPending: mockAddGuest.isPending,
  }),
}));

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
import { Share } from 'react-native';

import { useAuthStore } from '@/stores/auth';

import MatchDetailScreen, {
  formatCountdown,
} from '../../../../app/matches/[id]';

beforeEach(() => {
  mockBack.mockClear();
  mockPush.mockClear();
  mockShare.mockReset();
  mockShare.mockResolvedValue({ action: 'sharedAction' });
  jest.spyOn(Share, 'share').mockImplementation((...args: any[]) => mockShare(...args));
  mockParams = { id: 'near-1' };
  mockDetail.data = participantFixture();
  mockDetail.isPending = false;
  mockDetail.isError = false;
  mockDetail.refetch.mockClear();
  mockConfirm.mutate.mockClear();
  mockConfirm.isPending = false;
  mockDecline.mutate.mockClear();
  mockDecline.isPending = false;
  mockJoin.mutate.mockClear();
  mockJoin.isPending = false;
  // default: a non-organizer viewer (participant view)
  useAuthStore.setState({ userId: 'user-viewer' });
});

afterEach(() => {
  cleanup();
});

async function renderScreen() {
  await act(async () => {
    render(<MatchDetailScreen />);
  });
}

function variantOf(node: ReturnType<typeof screen.getByTestId>): string {
  return node.props['data-variant'];
}

describe('S12 — Match Detail screen', () => {
  // --------------------------------------------------- loading / error / retry
  /**
   * Covers: S12 — Match Detail
   * Criterion: "a loading skeleton shows while pending."
   */
  it('renders the loading skeleton while the query is pending', async () => {
    mockDetail.isPending = true;
    mockDetail.data = undefined;
    await renderScreen();

    expect(screen.getByTestId('match-detail-skeleton')).toBeTruthy();
    expect(screen.queryByText('Racha de Domingo')).toBeNull();
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: "an error state with retry shows on failure" -> "Tentar de novo"
   *  calls refetch().
   */
  it('renders the error state and calls refetch on retry', async () => {
    mockDetail.isError = true;
    mockDetail.data = undefined;
    await renderScreen();

    expect(screen.getByTestId('match-detail-error')).toBeTruthy();
    expect(
      screen.getByText('Não foi possível carregar a partida.'),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('match-detail-retry'));
    });
    expect(mockDetail.refetch).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------------- hero header
  /**
   * Covers: S12 — Match Detail
   * Criterion: "The hero header shows the back chevron (accessibilityLabel 'Voltar'
   *  -> router.back()), the share icon, the format mono pill, the level lime pill,
   *  the match name (font-display, uppercase), and the 'venue · distance' line."
   */
  it('renders the hero header (back/share, format + level pills, name, venue·distance)', async () => {
    await renderScreen();

    // back chevron -> router.back
    fireEvent.press(screen.getByLabelText('Voltar'));
    expect(mockBack).toHaveBeenCalledTimes(1);
    // share icon present
    expect(screen.getByLabelText('Compartilhar partida')).toBeTruthy();

    // format mono pill + level lime pill (format also appears in MODO cell)
    expect(screen.getAllByText('6X6').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Intermediário').length).toBeGreaterThan(0);

    // match name in font-display + uppercase
    const name = screen
      .getAllByText('Racha de Domingo')
      .find((n) => String(n.props.className).includes('font-display'));
    expect(name).toBeTruthy();
    expect(name?.props.className).toContain('uppercase');

    // venue · distance line (comma decimal)
    expect(screen.getByText('Arena Quadra · 1,2 km')).toBeTruthy();
  });

  // -------------------------------------------------------------- info card
  /**
   * Covers: S12 — Match Detail
   * Criterion: "The white info card shows the QUANDO / MODO / VAGAS / NÍVEL grid
   *  and the 'Organizado por {name}' row with the organizer's avatar and (when
   *  present) a position pill — colored primary on the light card."
   */
  it('renders the 2x2 metadata grid and the organizer row with a primary position pill', async () => {
    await renderScreen();

    // grid labels (uppercased via the `uppercase` class, not in the copy)
    expect(screen.getByText('Quando')).toBeTruthy();
    expect(screen.getByText('Modo')).toBeTruthy();
    expect(screen.getByText('Vagas')).toBeTruthy();
    expect(screen.getByText('Nível')).toBeTruthy();
    // VAGAS value = confirmedCount/capacity = 3/12
    expect(screen.getAllByText('3/12').length).toBeGreaterThan(0);

    // organizer row
    expect(screen.getByText('Organizado por')).toBeTruthy();
    expect(screen.getByText('Érica Moraes')).toBeTruthy();
    expect(screen.getByLabelText('Avatar de Érica Moraes')).toBeTruthy();

    // position pill, colored with the primary token on the light card
    const pill = screen.getByText('Central');
    expect(pill.props.className).toContain('text-primary');
  });

  // -------------------------------------------------------------- presence grid
  /**
   * Covers: S12 — Match Detail
   * Criterion: "The confirmed-players grid (PresenceGrid) shows one Avatar + name
   *  per confirmed player and dashed 'vaga' placeholders for the remaining slots
   *  (capped at 3); the section header reads 'CONFIRMADOS' + the N/M count."
   */
  it('renders the CONFIRMADOS section header and the presence grid with vaga slots', async () => {
    await renderScreen();

    expect(screen.getByText('Confirmados')).toBeTruthy();
    expect(screen.getByTestId('confirmed-count').props.children).toEqual([
      3,
      '/',
      12,
    ]);
    // confirmed players
    expect(screen.getByText('Renan')).toBeTruthy();
    expect(screen.getByText('Bia')).toBeTruthy();
    expect(screen.getByText('Caio')).toBeTruthy();
    // 12 - 3 = 9 open slots, but only MAX_VAGA_SLOTS (3) placeholders render
    expect(screen.getAllByTestId('presence-grid-empty')).toHaveLength(3);
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: "each confirmed player's avatar carries the tier-colored level
   *  badge, and a legend under the grid explains the tiers."
   */
  it('renders the level badges and the tier legend under the grid', async () => {
    await renderScreen();

    // one badge per confirmed player in the fixture (Renan + Caio are both 15)
    expect(screen.getAllByTestId('avatar-level-badge').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByLabelText('Nível 15')).toHaveLength(2);
    expect(screen.getByLabelText('Nível 9')).toBeTruthy();
    // the legend explains what the bolinha means
    expect(screen.getByTestId('level-legend')).toBeTruthy();
    expect(screen.getByText('Nv 15–30')).toBeTruthy();
    expect(screen.getByText('Nv 75+')).toBeTruthy();
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: "No per-player OVR number is rendered anywhere (Layer-3 cut), in the
   *  participant view."
   */
  it('renders no OVR label in the participant view', async () => {
    await renderScreen();
    expect(screen.queryByText(/OVR/i)).toBeNull();
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: "Confirmed-player avatars are display-only (no navigation on tap)."
   */
  it('does not navigate when a confirmed-player avatar is tapped', async () => {
    await renderScreen();

    fireEvent.press(screen.getByLabelText('Avatar de Renan'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------- countdown
  /**
   * Covers: S12 — Match Detail
   * Criterion: "A countdown line renders countdown to game start OR confirmation
   *  window close. When the window is still open it shows the time until close
   *  ('Confirmações fecham em …')." (pure formatter, injected fixed now)
   */
  it('formatCountdown shows "Confirmações fecham em …" while the window is open', () => {
    const match = participantFixture({
      confirmationWindowClosed: false,
      confirmationClosesAt: '2026-06-23T19:30:00.000Z',
    });
    const now = new Date('2026-06-23T18:00:00.000Z');
    expect(formatCountdown(match, now)).toBe('Confirmações fecham em 1h 30min');
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: "... and when the window is closed it shows the time until game
   *  start ('Começa em …')." (both branches required)
   */
  it('formatCountdown shows "Começa em …" once the window is closed', () => {
    const match = organizerFixture({
      confirmationWindowClosed: true,
      startsAt: '2026-06-23T22:00:00.000Z',
    });
    const now = new Date('2026-06-23T18:00:00.000Z');
    expect(formatCountdown(match, now)).toBe('Começa em 4h 0min');
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: the countdown strip renders the formatter output on the screen.
   */
  it('renders the countdown strip on the screen', async () => {
    await renderScreen();
    expect(screen.getByTestId('countdown')).toBeTruthy();
  });

  // -------------------------------------- participant footer: Regular confirm/decline
  /**
   * Covers: S12 — Match Detail
   * Criterion: "For a Regular participant with myStatus Pendente/Recusado,
   *  'Confirmar presença' (variant='grad', the prototype's full-width CTA) is
   *  shown and tapping it calls useConfirmPresence; the secondary decline calls
   *  useDeclinePresence."
   */
  it('shows Confirmar (grad) + decline for a Regular PENDENTE participant and wires both mutations', async () => {
    mockDetail.data = participantFixture({
      myParticipationType: 'REGULAR',
      myStatus: 'PENDENTE',
    });
    await renderScreen();

    const confirm = screen.getByTestId('confirm-presence');
    expect(confirm).toBeTruthy();
    expect(variantOf(confirm)).toBe('grad');
    expect(screen.getByText('Confirmar presença')).toBeTruthy();
    expect(screen.getByText('Não vou poder ir')).toBeTruthy();

    await act(async () => {
      fireEvent.press(confirm);
    });
    expect(mockConfirm.mutate).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(screen.getByTestId('decline-presence'));
    });
    expect(mockDecline.mutate).toHaveBeenCalledTimes(1);
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: "Confirmar presença ... re-enabled" for a RECUSADO Regular.
   */
  it('shows Confirmar presença again for a Regular RECUSADO participant', async () => {
    mockDetail.data = participantFixture({
      myParticipationType: 'REGULAR',
      myStatus: 'RECUSADO',
    });
    await renderScreen();

    const confirm = screen.getByTestId('confirm-presence');
    expect(confirm).toBeTruthy();
    expect(variantOf(confirm)).toBe('grad');
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: "tapping it ... shows the loading state" while the mutation pends.
   */
  it('shows the confirm CTA loading state while the mutation is pending', async () => {
    mockDetail.data = participantFixture({
      myParticipationType: 'REGULAR',
      myStatus: 'PENDENTE',
    });
    mockConfirm.isPending = true;
    await renderScreen();

    const confirm = screen.getByTestId('confirm-presence');
    expect(confirm.props.accessibilityState?.busy).toBe(true);
    expect(confirm.props.accessibilityState?.disabled).toBe(true);
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: once confirmed, the CTA flips to "Iniciar partida" (the
   *  prototype's post-confirm state) with the decline still available below;
   *  tapping decline calls useDeclinePresence.
   */
  it('flips the CTA to Iniciar partida for a Regular CONFIRMADO participant', async () => {
    mockDetail.data = participantFixture({
      myParticipationType: 'REGULAR',
      myStatus: 'CONFIRMADO',
    });
    await renderScreen();

    const start = screen.getByTestId('start-match');
    expect(variantOf(start)).toBe('primary');
    expect(screen.getByText('Iniciar partida')).toBeTruthy();
    expect(screen.queryByTestId('confirm-presence')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('decline-presence'));
    });
    expect(mockDecline.mutate).toHaveBeenCalledTimes(1);
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: "Iniciar partida" continues the SCOPE flow into S13 (teams)
   *  rather than jumping straight to the scoreboard.
   */
  it('navigates to S13 teams from Iniciar partida', async () => {
    mockDetail.data = participantFixture({
      myParticipationType: 'REGULAR',
      myStatus: 'CONFIRMADO',
    });
    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId('start-match'));
    });
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/matches/[id]/teams' }),
    );
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: "A user who is not a Regular participant is not shown
   *  confirm/decline." (myParticipationType null)
   */
  it('does not show confirm/decline for a non-Regular user', async () => {
    mockDetail.data = participantFixture({
      myParticipationType: null,
      myStatus: null,
      confirmationWindowClosed: true,
      openDropInSlots: 0,
    });
    await renderScreen();

    expect(screen.queryByTestId('confirm-presence')).toBeNull();
    expect(screen.queryByTestId('decline-presence')).toBeNull();
  });

  // ------------------------------------------------ participant footer: DropIn join
  /**
   * Covers: S12 — Match Detail
   * Criterion: "'Entrar na partida' (variant='primary') is shown only when the user
   *  is NOT a Regular participant AND open DropIn slots exist AND the confirmation
   *  window is closed; tapping it calls useJoinMatch."
   */
  it('shows Entrar na partida (primary) when non-Regular + open slots + window closed, and joins', async () => {
    mockDetail.data = participantFixture({
      myParticipationType: null,
      myStatus: null,
      openDropInSlots: 4,
      confirmationWindowClosed: true,
    });
    await renderScreen();

    const join = screen.getByTestId('join-match');
    expect(variantOf(join)).toBe('primary');
    // not a Regular -> no confirm/decline
    expect(screen.queryByTestId('confirm-presence')).toBeNull();

    await act(async () => {
      fireEvent.press(join);
    });
    expect(mockJoin.mutate).toHaveBeenCalledTimes(1);
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: a drop-in who already took a slot is past the join step — the CTA
   *  must not offer to join a match they are already in.
   */
  it('does not re-offer the join CTA to an already-confirmed drop-in', async () => {
    mockDetail.data = participantFixture({
      myParticipationType: 'DROPIN',
      myStatus: 'CONFIRMADO',
      openDropInSlots: 3,
      confirmationWindowClosed: true,
    });
    await renderScreen();

    expect(screen.queryByTestId('join-match')).toBeNull();
    expect(screen.getByTestId('start-match')).toBeTruthy();
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: "When any of those three conditions is false, the join CTA is not
   *  shown." (window still open -> no join; disabled "wait" CTA instead)
   */
  it('hides the join CTA when the window is still open (shows the disabled wait state)', async () => {
    mockDetail.data = participantFixture({
      myParticipationType: null,
      myStatus: null,
      openDropInSlots: 4,
      confirmationWindowClosed: false,
    });
    await renderScreen();

    expect(screen.queryByTestId('join-match')).toBeNull();
    const noAction = screen.getByTestId('no-action');
    expect(noAction.props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByText('Aguarde a janela de confirmação')).toBeTruthy();
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: no open slots -> no join; the disabled "Partida cheia" CTA shows.
   */
  it('hides the join CTA and shows the full disabled state when no slots are open', async () => {
    mockDetail.data = participantFixture({
      myParticipationType: null,
      myStatus: null,
      openDropInSlots: 0,
      confirmationWindowClosed: true,
    });
    await renderScreen();

    expect(screen.queryByTestId('join-match')).toBeNull();
    const noAction = screen.getByTestId('no-action');
    expect(noAction.props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByText('Partida cheia')).toBeTruthy();
  });

  // ----------------------------------------------------------------- valores
  /**
   * Covers: S12 — Match Detail
   * Criterion: "the VALORES section shows the avulso price; for a RECORRENTE
   *  match it also shows the monthly price, tagged 'Recorrente'."
   */
  it('renders both price tiles and the Recorrente tag for a recurring match', async () => {
    await renderScreen();

    expect(screen.getByText('Valores')).toBeTruthy();
    expect(screen.getByText('Recorrente')).toBeTruthy();
    expect(screen.getByTestId('price-single')).toBeTruthy();
    expect(screen.getByText('R$ 25')).toBeTruthy();
    expect(screen.getByTestId('price-monthly')).toBeTruthy();
    expect(screen.getByText('R$ 80')).toBeTruthy();
    expect(
      screen.getByText('Valor combinado direto com o organizador da partida.'),
    ).toBeTruthy();
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: an AVULSO match shows only the single price tile + "Avulso" tag.
   */
  it('renders only the avulso tile for a single-price match', async () => {
    mockDetail.data = participantFixture({
      pricePlan: 'AVULSO',
      priceMonthlyLabel: undefined,
    });
    await renderScreen();

    expect(screen.getByText('Avulso')).toBeTruthy();
    expect(screen.getByTestId('price-single')).toBeTruthy();
    expect(screen.queryByTestId('price-monthly')).toBeNull();
    expect(screen.queryByText('Recorrente')).toBeNull();
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: a free match renders "Grátis" in the success token, not a price.
   */
  it('renders Grátis in the success color for a free match', async () => {
    mockDetail.data = participantFixture({
      priceLabel: 'Grátis',
      pricePlan: 'AVULSO',
      priceMonthlyLabel: undefined,
    });
    await renderScreen();

    const free = screen.getByText('Grátis');
    expect(free.props.className).toContain('text-success');
  });

  // ----------------------------------------------------------------- share
  /**
   * Covers: S12 — Match Detail
   * Criterion: "the hero share icon invokes Share.share (mocked) — no navigation."
   */
  it('invokes Share.share from the hero share icon (no navigation)', async () => {
    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId('hero-share'));
    });
    expect(mockShare).toHaveBeenCalledTimes(1);
    expect(mockShare.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('Racha de Domingo'),
      }),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------- no chat
  /**
   * Covers: S12 — Match Detail
   * Criterion: "No chat UI is present."
   */
  it('renders no chat UI', async () => {
    await renderScreen();
    expect(screen.queryByText(/chat/i)).toBeNull();
    expect(screen.queryByText(/mensagem/i)).toBeNull();
    expect(screen.queryByTestId('chat')).toBeNull();
  });

  // ----------------------------------------------------------------- no tab bar
  /**
   * Covers: S12 — Match Detail
   * Criterion: "No bottom tab bar is shown (stack screen)."
   */
  it('renders no bottom tab bar', async () => {
    await renderScreen();
    expect(screen.queryByText('Início')).toBeNull();
    expect(screen.queryByText('Explorar')).toBeNull();
    expect(screen.queryByText('Perfil')).toBeNull();
  });

  // ============================ ORGANIZER VIEW ==============================
  function renderOrganizer(over: Partial<MatchDetail> = {}) {
    mockParams = { id: 'mine-1' };
    mockDetail.data = organizerFixture(over);
    useAuthStore.setState({ userId: ORGANIZER_USER_ID });
    return renderScreen();
  }

  /**
   * Covers: S12 — Match Detail
   * Criterion: "Organizer view: the 'VOCÊ ORGANIZA' badge, the 'Convidar' button,
   *  and the team-config block are shown; the participant footer CTA is replaced by
   *  'Montar os times' (variant='grad')."
   */
  it('renders the organizer view (badge, Convidar, team-config) with the grad footer CTA', async () => {
    await renderOrganizer();

    expect(screen.getByText('Você organiza')).toBeTruthy();
    expect(screen.getByTestId('invite')).toBeTruthy();
    expect(screen.getByText('Configuração dos times')).toBeTruthy();
    expect(screen.getByText('Como sortear os times')).toBeTruthy();

    // team-count chips, stepper, draw-mode rows present
    expect(screen.getByTestId('team-count-2')).toBeTruthy();
    expect(screen.getByTestId('per-team-stepper')).toBeTruthy();
    expect(screen.getByTestId('draw-mode-manual')).toBeTruthy();

    // footer CTA is the organizer forward CTA, variant="grad"
    const build = screen.getByTestId('build-teams');
    expect(variantOf(build)).toBe('grad');
    expect(screen.getByText('Montar os times')).toBeTruthy();

    // the participant footer CTAs are not present
    expect(screen.queryByTestId('confirm-presence')).toBeNull();
    expect(screen.queryByTestId('join-match')).toBeNull();
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: the organizer's forward CTA is "Montar os times" (variant="grad")
   *  and no participant CTA is rendered alongside it.
   */
  it('renders only the grad forward CTA in the organizer footer', async () => {
    await renderOrganizer();
    // the only grad button on screen is build-teams; participant primaries absent
    expect(variantOf(screen.getByTestId('build-teams'))).toBe('grad');
    expect(screen.queryByTestId('no-action')).toBeNull();
  });

  // ------------------------------------------- organizer presence (owner rule)
  /**
   * Covers: S12 — Match Detail
   * Criterion: "organizing is not playing" — the organizer opts into the
   *  confirmed grid via a ghost toggle, without losing the forward CTA.
   */
  it('offers the organizer a Vou jogar toggle while keeping Montar os times', async () => {
    await renderOrganizer({ myParticipationType: 'REGULAR', myStatus: 'PENDENTE' });

    const toggle = screen.getByTestId('organizer-presence');
    expect(variantOf(toggle)).toBe('ghost');
    expect(screen.getByText('Vou jogar')).toBeTruthy();
    // the forward CTA is still there — an organizer who does not play still
    // builds the teams
    expect(screen.getByTestId('build-teams')).toBeTruthy();

    await act(async () => {
      fireEvent.press(toggle);
    });
    expect(mockConfirm.mutate).toHaveBeenCalledTimes(1);
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: a confirmed organizer can take themselves back out of the list.
   */
  it('lets a confirmed organizer remove themselves via Não vou jogar', async () => {
    await renderOrganizer({
      myParticipationType: 'REGULAR',
      myStatus: 'CONFIRMADO',
    });

    expect(screen.getByText('Não vou jogar')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('organizer-presence'));
    });
    expect(mockDecline.mutate).toHaveBeenCalledTimes(1);
    expect(mockConfirm.mutate).not.toHaveBeenCalled();
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: "the 'N confirmados no total' caption" shows in the team-config block.
   */
  it('renders the "N confirmados no total" caption', async () => {
    await renderOrganizer();
    // organizer fixture has 3 confirmed players
    expect(screen.getByText('3 confirmados no total')).toBeTruthy();
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: "No per-player OVR number is rendered anywhere ... in the organizer
   *  view."
   */
  it('renders no OVR label in the organizer view', async () => {
    await renderOrganizer();
    expect(screen.queryByText(/OVR/i)).toBeNull();
  });

  // -------------------------------------------- team-count chips (single-select)
  /**
   * Covers: S12 — Match Detail
   * Criterion: "Team-count chips are single-select (default 2)."
   */
  it('defaults the team-count to 2 and single-selects among 2/3/4', async () => {
    await renderOrganizer();

    expect(
      screen.getByTestId('team-count-2').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('team-count-3').props.accessibilityState?.selected,
    ).toBe(false);
    expect(
      screen.getByTestId('team-count-4').props.accessibilityState?.selected,
    ).toBe(false);

    await act(async () => {
      fireEvent.press(screen.getByTestId('team-count-3'));
    });
    expect(
      screen.getByTestId('team-count-3').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('team-count-2').props.accessibilityState?.selected,
    ).toBe(false);
  });

  // ------------------------------------------------ players-per-team stepper min
  /**
   * Covers: S12 — Match Detail
   * Criterion: "the players-per-team stepper enforces its min."
   */
  it('enforces the players-per-team stepper minimum of 1', async () => {
    await renderOrganizer({
      teamConfig: { teamCount: 2, perTeam: 1, drawMode: 'MANUAL' },
    });

    // already at min=1 -> decrement is disabled
    expect(
      screen.getByTestId('per-team-stepper-decrement').props.accessibilityState
        ?.disabled,
    ).toBe(true);
    // value stays at 1 after attempting to decrement
    await act(async () => {
      fireEvent.press(screen.getByTestId('per-team-stepper-decrement'));
    });
    expect(screen.getByTestId('per-team-stepper').props.children).toEqual([
      '',
      1,
    ]);
  });

  // ------------------------------------------------ draw-mode rows (single-select)
  /**
   * Covers: S12 — Match Detail
   * Criterion: "the draw-mode rows are single-select (default Manual) and expose
   *  accessibilityRole='radio' + accessibilityState={{ checked }}."
   */
  it('defaults the draw mode to Manual and single-selects the radio rows', async () => {
    await renderOrganizer();

    const manual = screen.getByTestId('draw-mode-manual');
    const auto = screen.getByTestId('draw-mode-auto');

    expect(manual.props.accessibilityRole).toBe('radio');
    expect(auto.props.accessibilityRole).toBe('radio');
    expect(manual.props.accessibilityState?.checked).toBe(true);
    expect(auto.props.accessibilityState?.checked).toBe(false);

    await act(async () => {
      fireEvent.press(auto);
    });
    expect(
      screen.getByTestId('draw-mode-auto').props.accessibilityState?.checked,
    ).toBe(true);
    expect(
      screen.getByTestId('draw-mode-manual').props.accessibilityState?.checked,
    ).toBe(false);
  });

  // ----------------------------------------------------------- Convidar -> Share
  /**
   * Covers: S12 — Match Detail
   * Criterion: "The 'Convidar' button ... invokes Share.share — no navigation, no
   *  contact picker."
   */
  it('invokes Share.share from the organizer Convidar button (no navigation)', async () => {
    await renderOrganizer();

    await act(async () => {
      fireEvent.press(screen.getByTestId('invite'));
    });
    expect(mockShare).toHaveBeenCalledTimes(1);
    expect(mockShare.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('Sua partida'),
      }),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------- S13 navigation params
  /**
   * Covers: S12 — Match Detail
   * Criterion: "'Montar os times' navigates to S13 (/matches/[id]/teams) carrying
   *  { id, teamCount, perTeam, drawMode }."
   */
  it('navigates to /matches/[id]/teams with { id, teamCount, perTeam, drawMode }', async () => {
    await renderOrganizer();

    // change config so the params reflect the live selection
    await act(async () => {
      fireEvent.press(screen.getByTestId('team-count-4'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('draw-mode-auto'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('build-teams'));
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/matches/[id]/teams',
      params: {
        id: 'mine-1',
        teamCount: '4',
        perTeam: '4',
        drawMode: 'AUTO',
      },
    });
  });
});

describe('S12 — joining against the real backend', () => {
  const visitor = { myParticipationType: null, myStatus: null } as const;

  it('offers joining while the window is still open when the backend allows it', async () => {
    mockDetail.data = participantFixture({
      ...visitor,
      confirmationWindowClosed: false,
      canJoin: true,
    });
    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId('join-match'));
    });

    expect(mockJoin.mutate).toHaveBeenCalledTimes(1);
  });

  it('asks for the invite code of a private match and joins with it', async () => {
    mockDetail.data = participantFixture({
      ...visitor,
      canJoin: false,
      requiresInviteCode: true,
    });
    await renderScreen();

    expect(screen.queryByTestId('join-match')).toBeNull();
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('invite-code'), 'ab12cd34');
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('join-with-code'));
    });

    expect(mockJoin.mutate).toHaveBeenCalledWith({ inviteCode: 'ab12cd34' });
  });

  it('shows the place in the waiting list instead of a join button', async () => {
    mockDetail.data = participantFixture({
      ...visitor,
      canJoin: false,
      myWaitingListPosition: 2,
    });
    await renderScreen();

    expect(screen.getByText('Na fila de espera · 2º')).toBeTruthy();
    expect(screen.queryByTestId('join-match')).toBeNull();
  });
});

