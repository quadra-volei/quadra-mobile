import type {
  Level,
  Modality,
  Position,
} from '@/features/profile/schema/onboarding';
import { ApiError } from '@/lib/api/client';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

/** The single profile resource of the signed-in user (backend F2.1). */
export const MY_PROFILE_PATH = '/api/v1/profiles/me';

export type ApiLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite';
export type ApiModality = 'Indoor' | 'Beach';

/** `GET|PUT /api/v1/profiles/me` response (owner view). */
export type ApiProfile = {
  userId: string;
  displayName: string;
  firstName: string;
  lastName: string;
  /** Lowercase, without the leading '@'. Null until onboarding. */
  handle: string | null;
  /** ISO date `YYYY-MM-DD`. */
  birthDate: string | null;
  position: Position | null;
  modality: ApiModality | null;
  declaredLevel: ApiLevel | null;
  level: ApiLevel;
  photoUrl: string | null;
  /** Sent back on PUT to keep the current photo. */
  photoObjectKey: string | null;
  /** False for the empty profile created at sign-up: the app shows onboarding. */
  onboardingCompleted: boolean;
  skills: {
    overall: number;
    ace: number;
    block: number;
    attack: number;
    defense: number;
  };
  stats: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    mvpsReceived: number;
  };
};

/** `PUT /api/v1/profiles/me` body. */
export type ApiProfileUpdate = {
  firstName: string;
  lastName: string;
  handle: string;
  birthDate: string;
  position: Position;
  /** Required by the backend to complete onboarding; null afterwards keeps it. */
  modality: ApiModality | null;
  /** Self-declared level: only accepted while completing onboarding. */
  level: ApiLevel | null;
  photoObjectKey: string | null;
};

const LEVEL_TO_API: Record<Level, ApiLevel> = {
  INICIANTE: 'Beginner',
  INTERMEDIARIO: 'Intermediate',
  AVANCADO: 'Advanced',
};

const MODALITY_TO_API: Record<Modality, ApiModality> = {
  INDOOR: 'Indoor',
  BEACH: 'Beach',
};

export function toApiLevel(level: Level): ApiLevel {
  return LEVEL_TO_API[level];
}

export function toApiModality(modality: Modality): ApiModality {
  return MODALITY_TO_API[modality];
}

/** "14/03/1998" (the app's masked date) → "1998-03-14" (the API's ISO date). */
export function toApiDate(masked: string): string {
  const [day, month, year] = masked.split('/');
  return `${year}-${month}-${day}`;
}

/** "1998-03-14" → "14/03/1998". */
export function fromApiDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function fetchMyProfile(): Promise<ApiProfile> {
  return authorizedApiClient<ApiProfile>(MY_PROFILE_PATH);
}

export function putMyProfile(body: ApiProfileUpdate): Promise<ApiProfile> {
  return authorizedApiClient<ApiProfile>(MY_PROFILE_PATH, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Turns a failed profile save into an `Error` whose message can be shown to the
 * user as-is.
 */
export function toProfileError(error: unknown): Error {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 409:
        return new Error('Esse @ já está em uso. Escolha outro.');
      case 400:
        return new Error('Confira os dados informados e tente de novo.');
      case 401:
        return new Error('Sua sessão expirou. Entre novamente.');
      default:
        return new Error('Não foi possível salvar seu perfil.');
    }
  }
  // fetch rejects with a TypeError when the request never reached the server.
  if (error instanceof TypeError) {
    return new Error('Sem conexão. Verifique sua internet e tente de novo.');
  }
  return new Error('Não foi possível salvar seu perfil.');
}
