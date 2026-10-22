import type {
  Level,
  Modality,
  Position,
} from '@/features/profile/schema/onboarding';
import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { CardTitleCode } from '@/features/profile/card/cardTitles';
import { ApiError } from '@/lib/api/client';
import { authorizedApiClient } from '@/lib/api/authorizedClient';
import type { CardFinish } from '@/theme/cardFinish';

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
    /** Accumulated points: attendance +10, win +15, MVP +25. */
    totalPoints?: number;
    /** Level number reached with those points (starts at 1). */
    levelNumber?: number;
    /** Total points needed for the next level number. */
    nextLevelPoints?: number;
  };
  /** Only on my own profile: whether my followers see my activities. */
  shareActivity?: boolean | null;
  /** How the player dressed their card (API DECISIONS #65). */
  cardStyle?: ApiCardStyle | null;
  /** Recorded actions over the history (API DECISIONS #85); absent on an older API. */
  actions?: ApiActions | null;
};

type ApiActionSummary = { total: number; perMatch: number | null };

/** Matches with a stats sheet, and per action the total and the average per match. */
export type ApiActions = {
  matches: number;
  kills: ApiActionSummary;
  blocks: ApiActionSummary;
  aces: ApiActionSummary;
  digs: ApiActionSummary;
  assists: ApiActionSummary;
};

/** `cardStyle` on the profile and the `PUT /profiles/me/card-style` response. */
export type ApiCardStyle = {
  finish: CardFinish;
  title: CardTitleCode | null;
  /** The card's own photo; null shows the profile photo. */
  photoUrl: string | null;
  /** Only for the owner: sent back to keep the card photo. */
  photoObjectKey: string | null;
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

// Longest side of every uploaded photo (profile, post, match cover): sharp on a
// phone, ~10× lighter than the camera's original.
const MAX_PHOTO_PX = 1080;

/** A JPEG copy of the picked photo, at most MAX_PHOTO_PX on its longest side. */
async function shrinkPhoto(localUri: string): Promise<string> {
  const original = await ImageManipulator.manipulate(localUri).renderAsync();
  const scale = MAX_PHOTO_PX / Math.max(original.width, original.height);
  const image = scale < 1
    ? await ImageManipulator.manipulate(localUri)
        .resize({ width: Math.round(original.width * scale) })
        .renderAsync()
    : original;
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return saved.uri;
}

/**
 * Uploads a picked photo (`POST /profiles/me/photo/upload-url`, then a PUT of
 * the file straight to the storage) and returns the object key to save on the
 * profile. Every caller (profile, post, match cover) goes through here, so the
 * photo is shrunk here first. An environment with no photo storage (503) is an
 * error like any other: the caller must never report a photo as saved when it
 * was not (DECISIONS #170).
 */
export async function uploadProfilePhoto(pickedUri: string): Promise<string> {
  let localUri: string;
  try {
    localUri = await shrinkPhoto(pickedUri);
  } catch {
    throw new Error('Não foi possível preparar a foto. Tente outra imagem.');
  }
  const contentType = photoContentType(localUri);
  let target: { uploadUrl: string; objectKey: string };
  try {
    target = await authorizedApiClient('/api/v1/profiles/me/photo/upload-url', {
      method: 'POST',
      body: JSON.stringify({ contentType }),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) {
      throw new Error('O envio de fotos está indisponível no momento. Tente de novo mais tarde.');
    }
    if (error instanceof ApiError && error.status !== 401) {
      throw new Error(`Não foi possível preparar o envio da foto (erro ${error.status}).`);
    }
    throw error;
  }

  // The file is streamed from disk by the native module as the raw request
  // body, which is what a signed storage URL expects. React Native's `fetch`
  // cannot do this on Android (no reliable file:// → blob, and `{ uri }` is only
  // understood inside multipart FormData).
  let status: number;
  try {
    const result = await uploadAsync(target.uploadUrl, localUri, {
      httpMethod: 'PUT',
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      // The URL is signed for exactly this Content-Type.
      headers: { 'Content-Type': contentType },
    });
    status = result.status;
  } catch {
    throw new Error('Não foi possível enviar a foto. Verifique sua internet e tente de novo.');
  }
  if (status < 200 || status >= 300) {
    throw new Error(`Não foi possível enviar a foto (erro ${status}). Tente de novo.`);
  }
  return target.objectKey;
}

/** The image type of a picked file, by extension; the picker's edited output is JPEG. */
export function photoContentType(uri: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  const extension = uri.split(/[?#]/)[0]?.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
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
  // An error that already carries a message for the user (e.g. the photo upload).
  if (error instanceof Error && !(error instanceof ApiError)) {
    return error;
  }
  return new Error('Não foi possível salvar seu perfil.');
}
