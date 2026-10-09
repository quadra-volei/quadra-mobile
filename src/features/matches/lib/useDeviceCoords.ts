import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Coords } from '@/features/matches/api/matchesApi';

/**
 * The device's position when location permission was ALREADY granted, else
 * null. Never prompts: `LocationGate` asks at the app entry, before the
 * tabs mount, so Home and Explore fall back to a default centre only when the
 * permission was denied.
 */
// ~110 m: steady enough that GPS jitter does not refetch every nearby query,
// far below the 0,1 km the distances are shown with.
const roundCoord = (value: number) => Math.round(value * 1000) / 1000;

export function useDeviceCoords(): Coords | null {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== Location.PermissionStatus.GRANTED) return;
        // The last known fix answers at once but may be hours old (another
        // neighbourhood), so it only seeds the value until the fresh fix lands.
        const apply = (position: Location.LocationObject | null) => {
          if (!active || !position) return;
          const next = {
            latitude: roundCoord(position.coords.latitude),
            longitude: roundCoord(position.coords.longitude),
          };
          setCoords((prev) =>
            prev?.latitude === next.latitude && prev.longitude === next.longitude
              ? prev
              : next,
          );
        };
        apply(await Location.getLastKnownPositionAsync());
        apply(await Location.getCurrentPositionAsync());
      } catch {
        // No location available: callers keep their default centre.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return coords;
}
