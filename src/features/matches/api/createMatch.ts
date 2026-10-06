import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';

import {
  type Coords,
  postMatch,
  toApiCreateMatch,
  toMatchError,
} from '@/features/matches/api/matchesApi';
import { resolveMatchStartsAt } from '@/features/matches/lib/buildMatchDetail';
import type { CreateMatchInput } from '@/features/matches/schema/createMatch';

/**
 * Payload sent to the create-match mutation: the validated form input plus the
 * optional local cover image URI (set by the picker, not a validated field).
 */
export type CreateMatchPayload = CreateMatchInput & {
  /** Local URI of the picked cover image (optional). Not uploaded yet. */
  coverUri?: string;
};

export type CreateMatchResult = {
  match: { id: string };
};

/** São Paulo centre — where a match lands when the device location is unavailable. */
export const FALLBACK_COORDS: Coords = { latitude: -23.55, longitude: -46.63 };

/**
 * Where the match is, for the map and "perto de você".
 *
 * ponytail: the LOCAL field is free text, so the match is pinned to where the
 * organizer is when creating it (or the fallback when location is denied).
 * Replaced by the venue's own coordinates once the address search lands.
 */
async function resolveMatchCoords(): Promise<Coords> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      return FALLBACK_COORDS;
    }
    const position =
      (await Location.getLastKnownPositionAsync()) ??
      (await Location.getCurrentPositionAsync());
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return FALLBACK_COORDS;
  }
}

/**
 * Creates a match from the validated create-match input (`POST /api/v1/matches`).
 * The cover image is not sent: the backend has no match cover yet.
 */
async function createMatch(payload: CreateMatchPayload): Promise<CreateMatchResult> {
  const startsAt = resolveMatchStartsAt(payload);
  if (new Date(startsAt).getTime() <= Date.now()) {
    throw new Error('Esse horário já passou. Escolha um horário no futuro.');
  }

  try {
    const coords = await resolveMatchCoords();
    const match = await postMatch(toApiCreateMatch(payload, startsAt, coords));
    return { match: { id: match.id } };
  } catch (error) {
    throw toMatchError(error, {
      400: 'Confira os dados da partida e tente de novo.',
    });
  }
}

export function useCreateMatch() {
  const queryClient = useQueryClient();
  return useMutation<CreateMatchResult, Error, CreateMatchPayload>({
    mutationFn: createMatch,
    onSuccess: () => {
      // Refresh S5 Home's upcoming/nearby lists so the new match appears.
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
