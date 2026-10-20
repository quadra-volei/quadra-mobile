import type { MatchFormat, MatchLevel, NearbyMatch } from '@/features/matches/types/match';

/**
 * Explore filters. Explore fetches every open match within the API's 50 km cap
 * (max 200, nearest first) once, and everything here filters that list on the
 * device, so the filter sheet can count results live without a request.
 */
export type When = 'any' | 'today' | 'tomorrow' | 'weekend';
export type Sort = 'near' | 'soon';

export type ExploreFilters = {
  query: string;
  sort: Sort;
  when: When;
  /** null = no limit (the 50 km the API already caps). */
  maxKm: number | null;
  formats: MatchFormat[];
  levels: MatchLevel[];
  /** null = any price, 0 = free only. */
  maxPrice: number | null;
  withSpots: boolean;
};

export const DEFAULT_FILTERS: ExploreFilters = {
  query: '',
  sort: 'near',
  when: 'any',
  maxKm: null,
  formats: [],
  levels: [],
  maxPrice: null,
  withSpots: false,
};

const DAY = 86_400_000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whether a start time falls in the `when` window, relative to `now`. */
export function matchesWhen(startsAt: string | undefined, when: When, now: Date): boolean {
  if (when === 'any' || !startsAt) return true;
  const t = new Date(startsAt);
  const day = startOfDay(t);
  const today = startOfDay(now);
  if (when === 'today') return day === today;
  if (when === 'tomorrow') return day === today + DAY;
  // weekend: the coming Saturday and Sunday (today included when it is one).
  const daysToSunday = (7 - now.getDay()) % 7;
  return day >= today && day <= today + daysToSunday * DAY && (t.getDay() === 0 || t.getDay() === 6);
}

const startTime = (m: NearbyMatch) => (m.startsAt ? Date.parse(m.startsAt) : Number.MAX_SAFE_INTEGER);

export function applyFilters(
  source: NearbyMatch[],
  f: ExploreFilters,
  now: Date = new Date(),
): NearbyMatch[] {
  const q = f.query.trim().toLowerCase();
  const list = source.filter(
    (m) =>
      (!q || m.name.toLowerCase().includes(q) || (m.venue ?? '').toLowerCase().includes(q)) &&
      (f.maxKm == null || m.distanceKm <= f.maxKm) &&
      (f.formats.length === 0 || f.formats.includes(m.format)) &&
      (f.levels.length === 0 || f.levels.includes(m.level)) &&
      (f.maxPrice == null || (m.price ?? 0) <= f.maxPrice) &&
      (!f.withSpots || m.confirmed < m.capacity) &&
      matchesWhen(m.startsAt, f.when, now),
  );
  return f.sort === 'soon'
    ? list.sort((a, b) => startTime(a) - startTime(b))
    : list.sort((a, b) => a.distanceKm - b.distanceKm);
}

/** How many sheet filters differ from the default (the badge on "Filtros"). Search and sort not counted. */
export function countActive(f: ExploreFilters): number {
  return (
    Number(f.when !== 'any') +
    Number(f.maxKm != null) +
    Number(f.formats.length > 0) +
    Number(f.levels.length > 0) +
    Number(f.maxPrice != null) +
    Number(f.withSpots)
  );
}

/** Adds or removes `item` from a multi-select list. */
export function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}
