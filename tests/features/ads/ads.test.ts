/**
 * Self-service ads (DECISIONS #200): prices and dates as the advertiser reads them, where a tap
 * leads, the form's rules, and how often the opening card may come back.
 */
jest.mock('@/lib/api/authorizedClient', () => ({ authorizedApiClient: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/features/profile/api/profileApi', () => ({ uploadProfilePhoto: jest.fn() }));

import { adLinkUrl, formatPrice, lastDay, shortDate, totalPriceCents, type AdOffer } from '@/features/ads/api/ads';
import { brasiliaToday, newAdSchema, toIsoDay, toMasked, whatsAppDigits } from '@/features/ads/schema/newAd';

const offer: AdOffer = {
  placements: [
    { placement: 'Home', pricePerWeekCents: 5900 },
    { placement: 'Map', pricePerWeekCents: 2900 },
  ],
  radiusOptions: [5, 10, 20],
  weekOptions: [1, 2, 4],
  audience: { publicGames: 3, playerPresences: 40, arenas: 2 },
  paymentAvailable: false,
};

describe('ads api helpers', () => {
  it('shows prices in reais', () => {
    expect(formatPrice(5900)).toBe('R$ 59');
    expect(formatPrice(23600)).toBe('R$ 236');
    expect(formatPrice(1990)).toBe('R$ 19,90');
  });

  it('totals the weekly price, and has none for a placement off sale', () => {
    expect(totalPriceCents(offer, 'Home', 4)).toBe(23600);
    expect(totalPriceCents(offer, 'Opening', 1)).toBeNull();
  });

  it('shows the period from the first to the last day on the air', () => {
    expect(shortDate('2026-11-04')).toBe('04/11');
    expect(lastDay({ endsOn: '2026-11-11' })).toBe('2026-11-10');
    expect(lastDay({ endsOn: '2027-01-01' })).toBe('2026-12-31');
  });

  it('opens WhatsApp or an https site, nothing else', () => {
    expect(adLinkUrl({ linkKind: 'WhatsApp', linkValue: '5511999998888' })).toBe('https://wa.me/5511999998888');
    expect(adLinkUrl({ linkKind: 'Url', linkValue: 'https://arenasol.com.br' })).toBe('https://arenasol.com.br');
    expect(adLinkUrl({ linkKind: 'Url', linkValue: 'javascript:alert(1)' })).toBeNull();
    expect(adLinkUrl({ linkKind: 'None', linkValue: null })).toBeNull();
  });
});

describe('ad form', () => {
  const valid = {
    placement: 'Home' as const,
    radiusKm: 10,
    weeks: 1,
    startsOn: toMasked(brasiliaToday()),
    title: 'Arena Sol',
    body: '',
    linkKind: 'WhatsApp' as const,
    linkValue: '11 99999-8888',
  };

  it('reads the masked date and the Brasília day', () => {
    expect(toIsoDay('04/11/2026')).toBe('2026-11-04');
    expect(toIsoDay('31/02/2026')).toBeNull();
    expect(toMasked('2026-11-04')).toBe('04/11/2026');
    expect(brasiliaToday(new Date('2026-11-05T02:00:00Z'))).toBe('2026-11-04');
  });

  it('adds the country code to a Brazilian WhatsApp', () => {
    expect(whatsAppDigits('(11) 99999-8888')).toBe('5511999998888');
    expect(whatsAppDigits('+55 11 99999-8888')).toBe('5511999998888');
  });

  it('accepts a complete ad and refuses a past date, a short title or a bad link', () => {
    expect(newAdSchema.safeParse(valid).success).toBe(true);
    expect(newAdSchema.safeParse({ ...valid, startsOn: '01/01/2020' }).success).toBe(false);
    expect(newAdSchema.safeParse({ ...valid, title: 'ab' }).success).toBe(false);
    expect(newAdSchema.safeParse({ ...valid, linkValue: '9999' }).success).toBe(false);
    expect(newAdSchema.safeParse({ ...valid, linkKind: 'Url', linkValue: 'http://x.com' }).success).toBe(false);
    expect(newAdSchema.safeParse({ ...valid, linkKind: 'Url', linkValue: 'https://arenasol.com.br' }).success).toBe(true);
    expect(newAdSchema.safeParse({ ...valid, linkKind: 'None', linkValue: '' }).success).toBe(true);
  });
});
