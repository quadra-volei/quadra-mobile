import { MAX_BOX_DEGREES, boxToFetch, initialMapBox, toMapItems } from '@/features/explore/api/mapItems';

const box = (south: number, west: number, north: number, east: number) => ({ south, west, north, east });

describe('boxToFetch', () => {
  it('keeps the loaded rectangle while it covers the view', () => {
    const loaded = box(-23.66, -46.74, -23.46, -46.54);
    expect(boxToFetch(loaded, box(-23.6, -46.7, -23.5, -46.6))).toBe(loaded);
  });

  it('loads the view plus half its size on every side, on a 0.01° grid', () => {
    const loaded = box(-23.66, -46.74, -23.46, -46.54);
    expect(boxToFetch(loaded, box(-22.95, -43.25, -22.85, -43.15))).toEqual(box(-23, -43.3, -22.8, -43.1));
  });

  it('never asks for more than the API accepts across', () => {
    const next = boxToFetch(box(0, 0, 0.1, 0.1), box(-23, -47, -21, -45));
    expect(next.north - next.south).toBeLessThanOrEqual(MAX_BOX_DEGREES + 0.02);
    expect(next.east - next.west).toBeLessThanOrEqual(MAX_BOX_DEGREES + 0.02);
  });

  it('loads a much closer view again when the loaded one hit the limits', () => {
    const loaded = box(-24, -47, -23, -46);
    const close = box(-23.52, -46.52, -23.48, -46.48);
    expect(boxToFetch(loaded, close)).toBe(loaded);
    expect(boxToFetch(loaded, close, true)).not.toBe(loaded);
  });
});

describe('initialMapBox', () => {
  it('frames about 11 km around the user, rounded so the map and Explore share it', () => {
    expect(initialMapBox({ latitude: -23.5612, longitude: -46.6398 })).toEqual(box(-23.66, -46.74, -23.46, -46.54));
  });
});

describe('toMapItems', () => {
  it('maps arenas with their games and the games with no arena as cards', () => {
    const items = toMapItems({
      arenas: [
        {
          id: 'a1',
          placeId: 'ChIJ1',
          latitude: -23.5,
          longitude: -46.6,
          distanceKm: 1.2,
          kind: 'Sand',
          gamesCount: 6,
          live: true,
          nextGames: [{ id: 'g1', name: 'Rachão', dateTime: '2026-10-24T22:00:00Z', live: true, full: true, confirmedCount: 12, maxPlayers: 12 }],
        },
      ],
      games: [],
      arenaCount: 1,
      gameCount: 6,
      truncated: false,
    });

    expect(items.arenas[0]).toMatchObject({ id: 'a1', placeId: 'ChIJ1', lat: -23.5, lon: -46.6, kind: 'Sand', gamesCount: 6, live: true });
    expect(items.arenas[0]!.games[0]).toEqual({
      id: 'g1', name: 'Rachão', startsAt: '2026-10-24T22:00:00Z', live: true, full: true, confirmed: 12, capacity: 12,
    });
    expect(items).toMatchObject({ arenaCount: 1, gameCount: 6, truncated: false, games: [] });
  });
});
