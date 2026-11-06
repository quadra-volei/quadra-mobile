import Supercluster from 'supercluster';

/**
 * Groups the map's pins that would overlap on screen into one (DECISIONS #177, #179), with
 * `supercluster`: hierarchical by zoom level, so the same data at the same zoom always gives the
 * same groups, and a group splits the same way every time it is opened. A group sits at the
 * average point of its places and keeps the id of the place with the most games in it.
 */
export type MapPoint<T> = { id: string; lat: number; lon: number; games: number; item: T };

export type MapCluster<T> = {
  /** The id of the place with the most games in it: a stable key while the map stays put. */
  id: string;
  lat: number;
  lon: number;
  /** Games of every place in it. */
  games: number;
  points: MapPoint<T>[];
};

/** What the map shows (degrees) and its size on screen (dp). */
export type ClusterView = { latitudeDelta: number; longitudeDelta: number; width: number; height: number };

/** Pins this close on screen (dp) merge: about one pin's width. */
const CLUSTER_DP = 44;

/** Closer than this (about 2 km tall) nothing is grouped: every place shows. */
export const NO_CLUSTER_DELTA = 0.02;

/** The map's zoom level, on 256 dp tiles: what `supercluster` measures `CLUSTER_DP` against. */
export function zoomFor(view: Pick<ClusterView, 'longitudeDelta' | 'width'>): number {
  return Math.log2((360 * view.width) / (256 * view.longitudeDelta));
}

export function clusterPoints<T>(points: MapPoint<T>[], view: ClusterView): MapCluster<T>[] {
  const single = (p: MapPoint<T>): MapCluster<T> => ({ id: p.id, lat: p.lat, lon: p.lon, games: p.games, points: [p] });
  if (view.latitudeDelta < NO_CLUSTER_DELTA || points.length < 2) return points.map(single);

  const index = new Supercluster<{ i: number; games: number }, { games: number }>({
    radius: CLUSTER_DP,
    extent: 256,
    maxZoom: 20,
    map: (props) => ({ games: props.games }),
    reduce: (sum, props) => {
      sum.games += props.games;
    },
  });
  index.load(
    points.map((p, i) => ({
      type: 'Feature' as const,
      properties: { i, games: p.games },
      geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
    })),
  );

  return index.getClusters([-180, -85, 180, 85], Math.round(zoomFor(view))).map((feature) => {
    const props = feature.properties;
    if (!('cluster_id' in props)) return single(points[props.i]!);
    const members = index.getLeaves(props.cluster_id, Infinity).map((leaf) => points[leaf.properties.i]!);
    const [lon, lat] = feature.geometry.coordinates as [number, number];
    // Ties go to the smaller id, so the key does not depend on the order the pins came in.
    const seed = members.reduce((best, p) =>
      p.games > best.games || (p.games === best.games && p.id < best.id) ? p : best,
    );
    return { id: seed.id, lat, lon, games: props.games, points: members };
  });
}
