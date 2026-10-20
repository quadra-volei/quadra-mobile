import { distanceKm } from '@/features/matches/lib/distanceKm';

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    const p = { latitude: -23.58, longitude: -46.56 };
    expect(distanceKm(p, p)).toBe(0);
  });

  it('matches a known distance (Sé → MASP, about 2,6 km)', () => {
    const se = { latitude: -23.5505, longitude: -46.6333 };
    const masp = { latitude: -23.5614, longitude: -46.6559 };
    expect(distanceKm(se, masp)).toBeGreaterThan(2.5);
    expect(distanceKm(se, masp)).toBeLessThan(2.8);
  });
});
