import { useQuery } from '@tanstack/react-query';

import { authorizedApiClient } from '@/lib/api/authorizedClient';

// Season pass (`GET /api/v1/season-pass`, quadra-api DECISIONS #98): the
// ranking points of the season's recurring matches, at most `weeklyCap` a week,
// fill levels of `pointsPerLevel`. Each level gives a piece of the season's card
// (paid track, open to everyone in the closed test); some give a card title
// (free track); the last one the card's finish. The API decides what is
// unlocked; the app only draws it.

export type SeasonPassStatus = 'Upcoming' | 'Active' | 'Ended';

export type SeasonReward = {
  level: number;
  track: 'Free' | 'Premium';
  kind: 'Piece' | 'Title' | 'Finish';
  /** `PIECE_n`, a card title code or a card finish code. */
  code: string;
  unlocked: boolean;
};

export type SeasonPass = {
  /** Season code ("T1"): the card's art is keyed by it. */
  season: string;
  name: string;
  startsAt: string;
  /** The season is over at this moment (ISO). */
  endsAt: string;
  status: SeasonPassStatus;
  /** Points that count, after the weekly cap. */
  points: number;
  /** 0 to `levels`: pieces won. */
  level: number;
  levels: number;
  pointsPerLevel: number;
  weeklyCap: number;
  /** This week's points that count; 0 while the season is not being played. */
  weekPoints: number;
  /** When the weekly cap starts over (ISO); null while the season is not being played. */
  weekEndsAt: string | null;
  /** The paid track is open to the player. */
  premium: boolean;
  rewards: SeasonReward[];
};

export const seasonPassQueryKey = ['season-pass'] as const;

/** The player's pass; null when no season is set up (204). */
export async function getSeasonPass(): Promise<SeasonPass | null> {
  return (await authorizedApiClient<SeasonPass | undefined>('/api/v1/season-pass')) ?? null;
}

// Logout clears the whole cache, so the key needs no account.
export function useSeasonPass() {
  return useQuery({ queryKey: seasonPassQueryKey, queryFn: getSeasonPass });
}

/** The season's finish (the whole card), unlocked or not. */
export function seasonFinish(pass: SeasonPass): SeasonReward | undefined {
  return pass.rewards.find((r) => r.kind === 'Finish');
}

/** Pieces won: the unlocked ones (on the paid track, so the level alone is not enough). */
export function piecesWon(pass: SeasonPass): number {
  return pass.rewards.filter((r) => r.kind === 'Piece' && r.unlocked).length;
}
