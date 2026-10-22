import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Coords } from '@/features/matches/api/matchesApi';

// ~110 m: steady enough that GPS jitter does not refetch every nearby query,
// far below the 0,1 km the distances are shown with.
const roundCoord = (value: number) => Math.round(value * 1000) / 1000;

// A fix this recent answers at once; an older one may be another
// neighbourhood, so a fresh fix is waited for instead (it can take seconds).
const RECENT_FIX_MS = 5 * 60_000;

/**
 * The device's position, rounded like every nearby query so screens that read
 * it share their cached results (Explore and the map, DECISIONS #176). Null
 * when there is no fix. Assumes the permission is granted.
 */
export async function readDeviceCoords(): Promise<Coords | null> {
  const position =
    (await Location.getLastKnownPositionAsync({ maxAge: RECENT_FIX_MS })) ??
    (await Location.getCurrentPositionAsync());
  return position
    ? { latitude: roundCoord(position.coords.latitude), longitude: roundCoord(position.coords.longitude) }
    : null;
}

/**
 * The device's position when location permission was ALREADY granted, else
 * null. Never prompts: `LocationGate` asks at the app entry, before the
 * tabs mount, so Home and Explore fall back to a default centre only when the
 * permission was denied.
 */
export function useDeviceCoords(): Coords | null {
  return useDeviceLocation().coords;
}

/**
 * Same, plus `resolved`: false until the position is known or known to be
 * unavailable, so a screen can wait instead of searching the default centre
 * first and the real one a moment later.
 */
export function useDeviceLocation(): { coords: Coords | null; resolved: boolean } {
  const [state, setState] = useState<{ coords: Coords | null; resolved: boolean }>({
    coords: null,
    resolved: false,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      let coords: Coords | null = null;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === Location.PermissionStatus.GRANTED) coords = await readDeviceCoords();
      } catch {
        // No location available: callers keep their default centre.
      }
      if (active) setState({ coords, resolved: true });
    })();
    return () => {
      active = false;
    };
  }, []);

  return state;
}
