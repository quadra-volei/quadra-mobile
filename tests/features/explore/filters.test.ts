import { DEFAULT_FILTERS, applyFilters, countActive, matchesWhen } from '@/features/explore/lib/filters';
import type { NearbyMatch } from '@/features/matches/types/match';

// Wednesday 2026-10-14, 10:00 local.
const NOW = new Date(2026, 9, 14, 10, 0);
const at = (day: number, hour = 19) => new Date(2026, 9, day, hour, 0).toISOString();

describe('matchesWhen', () => {
  it('today and tomorrow follow the local calendar day', () => {
    expect(matchesWhen(at(14, 23), 'today', NOW)).toBe(true);
    expect(matchesWhen(at(15, 0), 'today', NOW)).toBe(false);
    expect(matchesWhen(at(15, 0), 'tomorrow', NOW)).toBe(true);
  });

  it('weekend is the coming Saturday and Sunday only', () => {
    expect(matchesWhen(at(17), 'weekend', NOW)).toBe(true); // Sat
    expect(matchesWhen(at(18), 'weekend', NOW)).toBe(true); // Sun
    expect(matchesWhen(at(16), 'weekend', NOW)).toBe(false); // Fri
    expect(matchesWhen(at(24), 'weekend', NOW)).toBe(false); // next Sat
  });

  it('on a Sunday, weekend means today', () => {
    const sunday = new Date(2026, 9, 18, 9, 0);
    expect(matchesWhen(at(18), 'weekend', sunday)).toBe(true);
    expect(matchesWhen(at(24), 'weekend', sunday)).toBe(false);
  });
});

describe('applyFilters', () => {
  const base = { format: '6X6', level: 'INICIANTE', confirmed: 0, capacity: 12, priceLabel: '', tint: '', lat: 0, lon: 0 } as const;
  const list: NearbyMatch[] = [
    { ...base, id: 'a', name: 'A', distanceKm: 1, startsAt: at(20), price: 30, confirmed: 12 },
    { ...base, id: 'b', name: 'B', distanceKm: 4, startsAt: at(15), price: null },
  ];

  it('sorts by start with "soon" and by distance otherwise', () => {
    expect(applyFilters(list, { ...DEFAULT_FILTERS, sort: 'soon' }, NOW).map((m) => m.id)).toEqual(['b', 'a']);
    expect(applyFilters(list, DEFAULT_FILTERS, NOW).map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('drops full matches with withSpots and pricier ones with maxPrice', () => {
    expect(applyFilters(list, { ...DEFAULT_FILTERS, withSpots: true }, NOW).map((m) => m.id)).toEqual(['b']);
    expect(applyFilters(list, { ...DEFAULT_FILTERS, maxPrice: 20 }, NOW).map((m) => m.id)).toEqual(['b']);
  });

  it('counts active sheet filters, not search or sort', () => {
    expect(countActive({ ...DEFAULT_FILTERS, query: 'x', sort: 'soon' })).toBe(0);
    expect(countActive({ ...DEFAULT_FILTERS, maxKm: 5, withSpots: true })).toBe(2);
  });
});
