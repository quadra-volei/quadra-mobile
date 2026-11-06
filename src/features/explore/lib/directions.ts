import { Linking, Platform } from 'react-native';

import type { Coords } from '@/features/matches/api/matchesApi';

/** Where the user is going: a place on the map and the name the ride apps show. */
export type Destination = Coords & { name?: string };

export type RideAppId = 'uber' | '99' | 'google-maps' | 'waze' | 'apple-maps';

/**
 * One way to get there. `url` opens the app (or its web page); `fallbackUrl`,
 * when there is one, is tried if `url` cannot be opened (99 not installed).
 */
export type RideOption = {
  id: RideAppId;
  label: string;
  kind: 'ride' | 'navigation';
  url: string;
  fallbackUrl?: string;
};

// How far the dotted line bows from the straight line, as a share of its length.
const ARC_BOW = 0.18;

/**
 * Points along a gentle arc from `from` to `to`: a quadratic curve whose control
 * point sits beside the midpoint. Only a hint of where the place is, not a route.
 */
export function arcBetween(from: Coords, to: Coords, steps = 32): Coords[] {
  const dLat = to.latitude - from.latitude;
  const dLon = to.longitude - from.longitude;
  // Always bow to the same side of the trip (left of the way there).
  const control = {
    latitude: (from.latitude + to.latitude) / 2 + dLon * ARC_BOW,
    longitude: (from.longitude + to.longitude) / 2 - dLat * ARC_BOW,
  };
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const a = (1 - t) ** 2;
    const b = 2 * (1 - t) * t;
    const c = t ** 2;
    return {
      latitude: a * from.latitude + b * control.latitude + c * to.latitude,
      longitude: a * from.longitude + b * control.longitude + c * to.longitude,
    };
  });
}

const fixed = (n: number) => n.toFixed(6);

/**
 * The ride and navigation apps that can take the user to `to`, in the order shown.
 * Uber, Google Maps, Waze and Apple Maps use their documented https links: they
 * open the app when installed and the web otherwise. 99 has no public link with a
 * destination, so its scheme opens the app (the destination may not come filled)
 * and its store page is the fallback.
 */
export function rideOptions(to: Destination, os: typeof Platform.OS = Platform.OS): RideOption[] {
  const lat = fixed(to.latitude);
  const lon = fixed(to.longitude);
  const name = to.name ? encodeURIComponent(to.name) : '';

  const uber = new URLSearchParams({
    action: 'setPickup',
    pickup: 'my_location',
    'dropoff[latitude]': lat,
    'dropoff[longitude]': lon,
    ...(to.name ? { 'dropoff[nickname]': to.name } : {}),
  });

  const options: RideOption[] = [
    { id: 'uber', label: 'Uber', kind: 'ride', url: `https://m.uber.com/ul/?${uber.toString()}` },
    {
      id: '99',
      label: '99',
      kind: 'ride',
      url: `taxis99://call?destination_latitude=${lat}&destination_longitude=${lon}${name ? `&destination_title=${name}` : ''}`,
      fallbackUrl:
        os === 'ios'
          ? 'https://apps.apple.com/br/app/id553663691'
          : 'https://play.google.com/store/apps/details?id=com.taxis99',
    },
    {
      id: 'google-maps',
      label: 'Google Maps',
      kind: 'navigation',
      url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
    },
    { id: 'waze', label: 'Waze', kind: 'navigation', url: `https://waze.com/ul?ll=${lat},${lon}&navigate=yes` },
  ];
  if (os === 'ios') {
    options.push({
      id: 'apple-maps',
      label: 'Apple Maps',
      kind: 'navigation',
      url: `https://maps.apple.com/?daddr=${lat},${lon}`,
    });
  }
  return options;
}

/**
 * Opens a ride option, falling back to its store page when the app's link
 * cannot be opened. No `canOpenURL`: it would need the schemes declared in the
 * native config (a new build), while `openURL` just fails when nothing handles it.
 */
export async function openRide(option: RideOption): Promise<void> {
  try {
    await Linking.openURL(option.url);
  } catch {
    if (option.fallbackUrl) await Linking.openURL(option.fallbackUrl).catch(() => undefined);
  }
}
