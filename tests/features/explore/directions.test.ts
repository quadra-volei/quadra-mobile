import { Linking } from 'react-native';

import { arcBetween, openRide, rideOptions } from '@/features/explore/lib/directions';

const from = { latitude: -23.56, longitude: -46.64 };
const to = { latitude: -23.5, longitude: -46.6, name: 'Arena Sky Beach' };

describe('arcBetween', () => {
  it('starts at the user, ends at the place and bows off the straight line', () => {
    const points = arcBetween(from, to, 10);
    expect(points).toHaveLength(11);
    expect(points[0]).toEqual({ latitude: from.latitude, longitude: from.longitude });
    expect(points[10]!.latitude).toBeCloseTo(to.latitude);
    expect(points[10]!.longitude).toBeCloseTo(to.longitude);
    // The middle point is off the straight midpoint, so the line reads as an arc.
    const mid = points[5]!;
    const straight = { latitude: (from.latitude + to.latitude) / 2, longitude: (from.longitude + to.longitude) / 2 };
    expect(Math.abs(mid.latitude - straight.latitude) + Math.abs(mid.longitude - straight.longitude)).toBeGreaterThan(0.005);
  });
});

describe('rideOptions', () => {
  it('fills the destination in every app link', () => {
    const options = rideOptions(to, 'android');
    expect(options.map((o) => o.id)).toEqual(['uber', '99', 'google-maps', 'waze']);
    const byId = Object.fromEntries(options.map((o) => [o.id, o]));
    expect(byId.uber!.url).toBe(
      'https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff%5Blatitude%5D=-23.500000&dropoff%5Blongitude%5D=-46.600000&dropoff%5Bnickname%5D=Arena+Sky+Beach',
    );
    expect(byId['99']!.url).toBe(
      'taxis99://call?destination_latitude=-23.500000&destination_longitude=-46.600000&destination_title=Arena%20Sky%20Beach',
    );
    expect(byId['99']!.fallbackUrl).toBe('https://play.google.com/store/apps/details?id=com.taxis99');
    expect(byId['google-maps']!.url).toBe('https://www.google.com/maps/dir/?api=1&destination=-23.500000,-46.600000');
    expect(byId.waze!.url).toBe('https://waze.com/ul?ll=-23.500000,-46.600000&navigate=yes');
  });

  it('adds Apple Maps and the App Store on iOS', () => {
    const options = rideOptions(to, 'ios');
    expect(options.map((o) => o.id)).toEqual(['uber', '99', 'google-maps', 'waze', 'apple-maps']);
    expect(options.find((o) => o.id === '99')!.fallbackUrl).toBe('https://apps.apple.com/br/app/id553663691');
  });

  it('leaves the name out when the place has none', () => {
    const [uber, ninetyNine] = rideOptions({ latitude: 1, longitude: 2 }, 'android');
    expect(uber!.url).not.toContain('nickname');
    expect(ninetyNine!.url).not.toContain('destination_title');
  });
});

describe('openRide', () => {
  afterEach(() => jest.restoreAllMocks());

  it('opens the store page when the app link cannot be opened', async () => {
    const openURL = jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValueOnce(new Error('no app'))
      .mockResolvedValue(true);
    const ninetyNine = rideOptions(to, 'android')[1]!;
    await openRide(ninetyNine);
    expect(openURL).toHaveBeenNthCalledWith(1, ninetyNine.url);
    expect(openURL).toHaveBeenNthCalledWith(2, ninetyNine.fallbackUrl);
  });

  it('does not throw when nothing can open the link', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no app'));
    await expect(openRide(rideOptions(to, 'android')[0]!)).resolves.toBeUndefined();
  });
});
