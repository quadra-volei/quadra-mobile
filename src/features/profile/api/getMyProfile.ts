import { useQuery } from '@tanstack/react-query';

import {
  type ApiProfile,
  fetchMyProfile,
  fromApiDate,
} from '@/features/profile/api/profileApi';
import type { MyProfile } from '@/features/profile/types/profile';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

/** Query key (ARCHITECTURE convention). */
export const myProfileQueryKey = ['profile', 'me'] as const;

// PLACEHOLDER: the backend has no XP / numeric level system yet (Gamification
// only tracks group-ranking points), so the "Level N · XP x / y" bar shows a
// neutral starting state instead of invented progress.
// TODO(real-api): replace once the backend exposes player XP.
const PLACEHOLDER_PROGRESS = { level: 1, xp: 0, xpToNext: 100 } as const;

type CurrentAccount = {
  phoneNumber: string | null;
};

/** "+5511984721130" → "11984721130" (the PhoneInput contract: national digits). */
function toNationalDigits(e164: string | null): string | undefined {
  if (!e164) {
    return undefined;
  }
  const digits = e164.replace(/\D/g, '');
  return digits.startsWith('55') ? digits.slice(2) : digits;
}

export function toMyProfile(api: ApiProfile, phoneNumber: string | null): MyProfile {
  return {
    id: api.userId,
    firstName: api.firstName,
    lastName: api.lastName,
    handle: api.handle ?? undefined,
    birthDate: api.birthDate ? fromApiDate(api.birthDate) : undefined,
    phone: toNationalDigits(phoneNumber),
    position: api.position ?? undefined,
    avatarUrl: api.photoUrl ?? undefined,
    overall: api.skills.overall,
    ace: api.skills.ace,
    blk: api.skills.block,
    ata: api.skills.attack,
    def: api.skills.defense,
    // PLACEHOLDER: the backend rates four skills; the card's SRV/REC cells show
    // the overall until serve/receive ratings exist.
    srv: api.skills.overall,
    rec: api.skills.overall,
    ...PLACEHOLDER_PROGRESS,
  };
}

/**
 * Fetches the authenticated user's profile (`GET /api/v1/profiles/me`): identity
 * fields and the skill ratings the backend derives from the declared level and
 * position. The phone shown in S10 is the login phone, read from the account
 * (`GET /api/v1/auth/me`); a Google account has none.
 */
export async function getMyProfile(): Promise<MyProfile> {
  const [profile, account] = await Promise.all([
    fetchMyProfile(),
    authorizedApiClient<CurrentAccount>('/api/v1/auth/me'),
  ]);
  return toMyProfile(profile, account.phoneNumber);
}

export function useMyProfile() {
  return useQuery({
    queryKey: myProfileQueryKey,
    queryFn: getMyProfile,
  });
}
