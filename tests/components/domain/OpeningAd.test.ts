jest.mock('@/lib/api/authorizedClient', () => ({ authorizedApiClient: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/features/profile/api/profileApi', () => ({ uploadProfilePhoto: jest.fn() }));

import { OPENING_AD_EVERY_MS, openingAdDue } from '@/components/domain/OpeningAd';

/** The opening card (DECISIONS #200) comes back for the same ad only after a week. */
it('shows an ad once a week at most', () => {
  const now = 1_800_000_000_000;
  expect(openingAdDue({}, 'a', now)).toBe(true);
  expect(openingAdDue({ a: now - 60_000 }, 'a', now)).toBe(false);
  expect(openingAdDue({ a: now - OPENING_AD_EVERY_MS }, 'a', now)).toBe(true);
  expect(openingAdDue({ a: now }, 'b', now)).toBe(true);
});
