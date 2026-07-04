/**
 * Create-match → domain mapping helpers (`src/features/matches/lib/buildMatchDetail.ts`).
 *
 * These are the pure functions that turn the REAL entered create-match input
 * (persisted in memory for the session) into the shapes the read layers consume,
 * so the success screen, S12 detail and the S5 home list all reflect what the
 * organizer actually typed instead of a static fixture.
 */
import {
  buildMatchDetail,
  buildUpcomingMatch,
  formatPriceLabel,
  resolveMatchStartsAt,
  type CreatedMatch,
} from '@/features/matches/lib/buildMatchDetail';
import type { CreateMatchInput } from '@/features/matches/schema/createMatch';

const baseInput: CreateMatchInput = {
  name: 'Racha de Quinta',
  location: 'Arena Central',
  day: 'today',
  format: '4X4',
  level: 'AVANCADO',
  type: 'Recurring',
  players: 8,
  price: 25,
  confirmationOpensHoursBefore: 24,
  isOpen: true,
};

function makeRecord(overrides: Partial<CreatedMatch> = {}): CreatedMatch {
  return {
    id: 'mine-123',
    organizerId: 'user-1',
    startsAt: '2026-07-03T22:00:00.000Z',
    createdAt: '2026-07-03T12:00:00.000Z',
    input: baseInput,
    ...overrides,
  };
}

describe('formatPriceLabel', () => {
  it('renders "Grátis" for 0 and "R$ N" otherwise', () => {
    expect(formatPriceLabel(0)).toBe('Grátis');
    expect(formatPriceLabel(25)).toBe('R$ 25');
  });
});

describe('resolveMatchStartsAt', () => {
  // A fixed Wednesday 2026-07-01 10:00 local as the injectable "now".
  const now = new Date(2026, 6, 1, 10, 0, 0); // month is 0-based → July

  it('resolves "today" to the same day at the default evening hour', () => {
    const d = new Date(resolveMatchStartsAt('today', now));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(19);
    expect(d.getMinutes()).toBe(0);
  });

  it('resolves "tomorrow" to the next day', () => {
    const d = new Date(resolveMatchStartsAt('tomorrow', now));
    expect(d.getDate()).toBe(2);
    expect(d.getHours()).toBe(19);
  });

  it('resolves "fri" to the coming Friday (2026-07-03 from a Wednesday)', () => {
    const d = new Date(resolveMatchStartsAt('fri', now));
    expect(d.getDay()).toBe(5); // Friday
    expect(d.getDate()).toBe(3);
  });

  it('resolves "sat" to the coming Saturday (2026-07-04)', () => {
    const d = new Date(resolveMatchStartsAt('sat', now));
    expect(d.getDay()).toBe(6); // Saturday
    expect(d.getDate()).toBe(4);
  });
});

describe('buildMatchDetail', () => {
  it('maps the entered data into a full organizer MatchDetail', () => {
    const detail = buildMatchDetail(makeRecord());

    expect(detail.id).toBe('mine-123');
    expect(detail.name).toBe('Racha de Quinta');
    expect(detail.venue).toBe('Arena Central');
    expect(detail.format).toBe('4X4');
    expect(detail.level).toBe('AVANCADO');
    expect(detail.capacity).toBe(8);
    expect(detail.priceLabel).toBe('R$ 25');
    expect(detail.startsAt).toBe('2026-07-03T22:00:00.000Z');
    // Window closes at match start; not yet closed for a fresh match.
    expect(detail.confirmationClosesAt).toBe(detail.startsAt);
    expect(detail.confirmationWindowClosed).toBe(false);
  });

  it('makes the current user the organizer and the only confirmed player', () => {
    const detail = buildMatchDetail(makeRecord({ organizerId: 'user-42' }));

    expect(detail.organizerId).toBe('user-42');
    expect(detail.organizer).toEqual({ id: 'user-42', name: 'Você' });
    expect(detail.players).toEqual([
      { id: 'user-42', name: 'Você', status: 'CONFIRMADO' },
    ]);
    expect(detail.myParticipationType).toBeNull();
    expect(detail.myStatus).toBeNull();
  });

  it('opens drop-in slots only for a public match', () => {
    const open = buildMatchDetail(makeRecord());
    expect(open.openDropInSlots).toBe(7); // players - organizer

    const priv = buildMatchDetail(
      makeRecord({ input: { ...baseInput, isOpen: false } }),
    );
    expect(priv.openDropInSlots).toBe(0);
  });

  it('derives a 2-team config sized to the player count', () => {
    const detail = buildMatchDetail(makeRecord());
    expect(detail.teamConfig).toEqual({
      teamCount: 2,
      perTeam: 4,
      drawMode: 'MANUAL',
    });
  });
});

describe('buildUpcomingMatch', () => {
  it('maps the entered data into a compact home-card summary', () => {
    const summary = buildUpcomingMatch(makeRecord());
    expect(summary).toEqual({
      id: 'mine-123',
      name: 'Racha de Quinta',
      startsAt: '2026-07-03T22:00:00.000Z',
      category: 'COMPETITIVO', // AVANCADO → competitivo
      openSlots: 7,
      priceLabel: 'R$ 25',
      avatarUrls: [],
    });
  });

  it('labels non-advanced levels as CASUAL and free matches as Grátis', () => {
    const summary = buildUpcomingMatch(
      makeRecord({
        input: { ...baseInput, level: 'INTERMEDIARIO', price: 0 },
      }),
    );
    expect(summary.category).toBe('CASUAL');
    expect(summary.priceLabel).toBe('Grátis');
  });
});
