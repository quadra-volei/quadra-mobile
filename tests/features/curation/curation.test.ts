import { googleMapsUrl, toCandidates } from '@/features/curation/api/curation';

describe('curation api', () => {
  it('maps the candidates and arenas of an area', () => {
    const out = toCandidates({
      candidates: [
        {
          placeId: 'ChIJ1',
          latitude: -23.5,
          longitude: -46.6,
          kind: 'Park',
          distanceKm: 0.8,
          gamesNearby: 3,
          neighbors: ['ChIJ2'],
          expiresAt: '2026-11-20T00:00:00Z',
        },
      ],
      arenas: [{ id: 'a1', placeId: null, latitude: -23.51, longitude: -46.61, kind: 'Sand' }],
      pendingCount: 12,
      truncated: false,
    });

    expect(out.candidates[0]).toEqual({
      placeId: 'ChIJ1', lat: -23.5, lon: -46.6, kind: 'Park', distanceKm: 0.8, gamesNearby: 3, neighbors: ['ChIJ2'],
      expiresAt: '2026-11-20T00:00:00Z',
    });
    expect(out.arenas[0]).toEqual({ id: 'a1', placeId: null, lat: -23.51, lon: -46.61, kind: 'Sand' });
    expect(out.pendingCount).toBe(12);
  });

  it('opens the exact place on Google Maps', () => {
    expect(googleMapsUrl({ lat: -23.5, lon: -46.6, placeId: 'ChIJ x' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=-23.5,-46.6&query_place_id=ChIJ%20x',
    );
  });
});
