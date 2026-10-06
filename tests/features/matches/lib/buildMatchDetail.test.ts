/**
 * Create-match schedule resolution (`src/features/matches/lib/buildMatchDetail.ts`):
 * the entered day/time becomes the concrete start timestamp sent to the backend.
 */
import { resolveMatchStartsAt } from '@/features/matches/lib/buildMatchDetail';
import type { CreateMatchInput } from '@/features/matches/schema/createMatch';

const baseInput: CreateMatchInput = {
  name: 'Racha de Quinta',
  location: 'Arena Central',
  type: 'Recurring',
  whenType: undefined,
  customDate: '',
  recDays: [3],
  recFreq: 'weekly',
  recStart: '03/07/2026',
  time: '22h00',
  duration: '1h30',
  format: '4X4',
  level: 'AVANCADO',
  players: 8,
  price: 25,
  priceMonthly: 80,
  confirmationOpensHoursBefore: 24,
  privacy: 'open',
};

describe('resolveMatchStartsAt', () => {
  // A fixed Wednesday 2026-07-01 10:00 local as the injectable "now".
  const now = new Date(2026, 6, 1, 10, 0, 0); // month is 0-based → July

  it('resolves a OneOff "today" to the same day at the chosen time', () => {
    const d = new Date(
      resolveMatchStartsAt(
        { type: 'OneOff', whenType: 'today', time: '19h00' },
        now,
      ),
    );
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(19);
    expect(d.getMinutes()).toBe(0);
  });

  it('resolves a OneOff "tomorrow" to the next day, honoring the minutes', () => {
    const d = new Date(
      resolveMatchStartsAt(
        { type: 'OneOff', whenType: 'tomorrow', time: '20h30' },
        now,
      ),
    );
    expect(d.getDate()).toBe(2);
    expect(d.getHours()).toBe(20);
    expect(d.getMinutes()).toBe(30);
  });

  it('resolves a OneOff "date" to the entered custom DD/MM/AAAA', () => {
    const d = new Date(
      resolveMatchStartsAt(
        { type: 'OneOff', whenType: 'date', customDate: '03/07/2026', time: '19h00' },
        now,
      ),
    );
    expect(d.getDay()).toBe(5); // Friday
    expect(d.getDate()).toBe(3);
  });

  it('resolves a Recurring match to its start date at the chosen time', () => {
    const d = new Date(
      resolveMatchStartsAt(
        { type: 'Recurring', recStart: '04/07/2026', time: '22h00' },
        now,
      ),
    );
    expect(d.getDay()).toBe(6); // Saturday
    expect(d.getDate()).toBe(4);
    expect(d.getHours()).toBe(22);
  });

  it('falls back to the evening hour when the time is malformed', () => {
    const d = new Date(
      resolveMatchStartsAt({ type: 'OneOff', whenType: 'today', time: '' }, now),
    );
    expect(d.getHours()).toBe(19);
    expect(d.getMinutes()).toBe(0);
  });
});
