/**
 * Groups the map's pins that would overlap on screen into one (DECISIONS #177),
 * the way Google's marker clustering utility does it (distance based, not
 * hierarchical): the place with the most games starts a group and takes every
 * pin within one pin's width of it; the group sits at their average point.
 * Pins with games start groups first, so a group forms around them.
 *
 * ponytail: every pin against every pin, fine for the ≤ 400 the API returns
 * (200 arenas, 200 games); a spatial index (supercluster) if that grows.
 */
export type MapPoint<T> = { id: string; lat: number; lon: number; games: number; item: T };

export type MapCluster<T> = {
  /** The id of the pin that started it: a stable key while the map stays put. */
  id: string;
  lat: number;
  lon: number;
  /** Games of every pin in it. */
  games: number;
  points: MapPoint<T>[];
};

/** What the map shows (degrees) and its size on screen (dp). */
export type ClusterView = { latitudeDelta: number; longitudeDelta: number; width: number; height: number };

/** Pins this close on screen (dp) merge: about one pin's width. */
const CLUSTER_DP = 44;

/** Closer than this (about 2 km tall) nothing is grouped: every place shows. */
export const NO_CLUSTER_DELTA = 0.02;

export function clusterPoints<T>(points: MapPoint<T>[], view: ClusterView): MapCluster<T>[] {
  const single = (p: MapPoint<T>): MapCluster<T> => ({ id: p.id, lat: p.lat, lon: p.lon, games: p.games, points: [p] });
  if (view.latitudeDelta < NO_CLUSTER_DELTA) return points.map(single);

  const maxLat = (CLUSTER_DP * view.latitudeDelta) / view.height;
  const maxLon = (CLUSTER_DP * view.longitudeDelta) / view.width;
  const seeds = [...points].sort((a, b) => b.games - a.games);
  const taken = new Set<string>();
  const clusters: MapCluster<T>[] = [];
  for (const seed of seeds) {
    if (taken.has(seed.id)) continue;
    const members = seeds.filter(
      (p) => !taken.has(p.id) && Math.abs(p.lat - seed.lat) <= maxLat && Math.abs(p.lon - seed.lon) <= maxLon,
    );
    for (const p of members) taken.add(p.id);
    if (members.length === 1) {
      clusters.push(single(seed));
      continue;
    }
    clusters.push({
      id: seed.id,
      lat: members.reduce((sum, p) => sum + p.lat, 0) / members.length,
      lon: members.reduce((sum, p) => sum + p.lon, 0) / members.length,
      games: members.reduce((sum, p) => sum + p.games, 0),
      points: members,
    });
  }
  return clusters;
}
