import { NO_CLUSTER_DELTA, clusterPoints, type MapPoint } from '@/features/explore/lib/cluster';

// A 400 x 800 dp map showing 0.08° across and down: 44 dp is 0.0044° across, 0.0088° tall.
const view = { latitudeDelta: 0.08, longitudeDelta: 0.08, width: 400, height: 800 };
const point = (id: string, lat: number, lon: number, games = 0): MapPoint<string> => ({ id, lat, lon, games, item: id });

describe('clusterPoints', () => {
  it('keeps pins apart when they do not overlap on screen', () => {
    const out = clusterPoints([point('a', 0, 0), point('b', 0, 0.01)], view);
    expect(out.map((c) => c.points.length)).toEqual([1, 1]);
  });

  it('groups overlapping pins at their average point, with every game inside', () => {
    const out = clusterPoints([point('a', 0, 0, 2), point('b', 0.004, 0.002, 1), point('c', 0, 0.01)], view);
    const group = out.find((c) => c.points.length > 1)!;
    expect(group.points.map((p) => p.id).sort()).toEqual(['a', 'b']);
    expect(group.games).toBe(3);
    expect(group.lat).toBeCloseTo(0.002);
    expect(group.lon).toBeCloseTo(0.001);
  });

  it('starts groups at the pins with games, so the group keeps their id', () => {
    const out = clusterPoints([point('empty', 0, 0), point('games', 0, 0.003, 1)], view);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe('games');
  });

  it('gives the same groups for the same pins at the same zoom, in any order', () => {
    const pins = [point('a', 0, 0, 2), point('b', 0.004, 0.002, 1), point('c', 0, 0.01), point('d', 0.001, 0.0102)];
    const ids = (out: ReturnType<typeof clusterPoints>) => out.map((c) => `${c.id}:${c.points.length}`).sort();
    // A slightly different view at the same zoom level, and the pins in another order.
    const nudged = { ...view, latitudeDelta: 0.079, longitudeDelta: 0.079 };
    expect(ids(clusterPoints([...pins].reverse(), nudged))).toEqual(ids(clusterPoints(pins, view)));
  });

  it('groups nothing close in', () => {
    const close = { ...view, latitudeDelta: NO_CLUSTER_DELTA / 2, longitudeDelta: NO_CLUSTER_DELTA / 2 };
    expect(clusterPoints([point('a', 0, 0), point('b', 0, 0)], close)).toHaveLength(2);
  });
});
