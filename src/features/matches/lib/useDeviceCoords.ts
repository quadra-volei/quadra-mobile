import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Coords } from '@/features/matches/api/matchesApi';

/**
 * The device's position when location permission was ALREADY granted, else
 * null. Never prompts: asking for the permission belongs to the map screen
 * (S17), so Home and Explore fall back to a default centre until then.
 */
export function useDeviceCoords(): Coords | null {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== Location.PermissionStatus.GRANTED) return;
        const position =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync());
        if (active) {
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
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
