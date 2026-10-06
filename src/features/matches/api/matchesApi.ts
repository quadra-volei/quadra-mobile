import type { CreateMatchInput } from '@/features/matches/schema/createMatch';
import type {
  MatchFormat,
  MatchLevel,
  NearbyMatch,
  UpcomingMatch,
} from '@/features/matches/types/match';
import type {
  MatchDetail,
  MatchGameStage,
  ParticipationType,
  PlayerPosition,
  PresencePlayer,
  PresenceStatus,
} from '@/features/matches/types/matchDetail';
import { ApiError } from '@/lib/api/client';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

/** Backend Matches module (F1.1 / F1.2 / F1.7). */
export const MATCHES_PATH = '/api/v1/matches';

export type ApiMatchLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type ApiMatchStatus = 'Draft' | 'Open' | 'Closed' | 'InProgress' | 'Finished' | 'Cancelled';
type ApiPresenceStatus = 'Confirmed' | 'Declined' | 'Pending';
type ApiPlayerType = 'Regular' | 'DropIn';

/** A match as every Matches endpoint returns it. */
export type ApiMatch = {
  id: string;
  organizerId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  /** ISO start timestamp. */
  dateTime: string;
  maxPlayers: number;
  price: number | null;
  type: 'OneOff' | 'Recurring';
  windowOpensAt: string;
  windowClosesAt: string;
  status: ApiMatchStatus | string;
  format: string | null;
  level: string | null;
  durationMinutes: number | null;
  visibility: 'Open' | 'Private';
  inviteMode: 'Code' | 'Guests' | null;
  priceMonthly: number | null;
};

export type ApiPlayer = {
  userId: string;
  displayName: string;
  handle: string | null;
  position: string | null;
  level: string;
  photoUrl: string | null;
};

/** `GET /matches/{id}/detail`. */
export type ApiMatchDetail = {
  match: ApiMatch;
  /** Only sent to the organizer of a private match joined by code. */
  inviteCode: string | null;
  organizer: ApiPlayer;
  players: { player: ApiPlayer; playerType: ApiPlayerType; status: ApiPresenceStatus }[];
  guests: { id: string; name: string; position: string | null }[];
  confirmedCount: number;
  openSlots: number;
  myPresence: { playerType: ApiPlayerType; status: ApiPresenceStatus } | null;
  myWaitingListPosition: number | null;
  canJoin: boolean;
  /** Null until a scoreboard exists. */
  game?: {
    scoreboardState: 'NotStarted' | 'InProgress' | 'Ended';
    mvpVotingState: 'None' | 'Open' | 'Closed';
    hasSummary: boolean;
  } | null;
};

/** One item of `GET /matches/mine`. */
export type ApiMyMatch = {
  match: ApiMatch;
  confirmedCount: number;
  openSlots: number;
  confirmedPhotoUrls: string[];
  isOrganizer: boolean;
  myStatus: ApiPresenceStatus | null;
};

/** One item of `GET /matches/nearby`. */
export type ApiNearbyMatch = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  /** ISO start timestamp. */
  dateTime?: string;
  maxPlayers: number;
  price: number | null;
  confirmedCount: number;
  format: string | null;
  level: string | null;
};

/** `POST /matches` body, as the create form fills it. */
export type ApiCreateMatch = {
  name: string;
  description: null;
  address: string;
  latitude: number;
  longitude: number;
  dateTime: string;
  maxPlayers: number;
  regularSlots: number;
  price: number | null;
  type: 'OneOff' | 'Recurring';
  frequency: 'Weekly' | 'Biweekly' | 'Monthly' | null;
  dayOfWeek: null;
  format: MatchFormat;
  level: ApiMatchLevel;
  durationMinutes: number;
  visibility: 'Open' | 'Private';
  inviteMode: 'Code' | 'Guests' | null;
  priceMonthly: number | null;
  recurrenceDays: number[] | null;
  confirmationOpensHoursBefore: number;
};

export type Coords = { latitude: number; longitude: number };

// ── vocabulary ──────────────────────────────────────────────────────────────

const LEVEL_TO_API: Record<MatchLevel, ApiMatchLevel> = {
  INICIANTE: 'Beginner',
  INTERMEDIARIO: 'Intermediate',
  AVANCADO: 'Advanced',
};

const LEVEL_FROM_API: Record<string, MatchLevel> = {
  Beginner: 'INICIANTE',
  Intermediate: 'INTERMEDIARIO',
  Advanced: 'AVANCADO',
};

const FORMATS: readonly string[] = ['2X2', '4X4', '6X6'];
const POSITIONS: readonly string[] = ['LEV', 'PON', 'OPO', 'CEN', 'LIB', 'COR'];

const STATUS_FROM_API: Record<ApiPresenceStatus, PresenceStatus> = {
  Confirmed: 'CONFIRMADO',
  Declined: 'RECUSADO',
  Pending: 'PENDENTE',
};

const FREQUENCY_TO_API = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
} as const;

// A match created outside the app may have no format/level; the cards need one.
function toFormat(format: string | null): MatchFormat {
  return format && FORMATS.includes(format) ? (format as MatchFormat) : '6X6';
}

function toLevel(level: string | null): MatchLevel {
  return (level && LEVEL_FROM_API[level]) || 'INTERMEDIARIO';
}

function toPosition(position: string | null): PlayerPosition | undefined {
  return position && POSITIONS.includes(position)
    ? (position as PlayerPosition)
    : undefined;
}

/** "Grátis" for no price, "R$ N" otherwise. */
export function formatPriceLabel(price: number | null): string {
  return price ? `R$ ${price}` : 'Grátis';
}

/** Court-image cover tint per level, mirroring the prototype's level scale. */
export function tintForLevel(level: MatchLevel): string {
  if (level === 'INICIANTE') return '#00B4D8';
  if (level === 'AVANCADO') return '#6B1AFF';
  return '#1A1AFF'; // INTERMEDIARIO
}

/** '1h30' → 90. */
function toMinutes(duration: string): number {
  const [hours, minutes] = duration.split('h');
  return Number(hours) * 60 + Number(minutes || 0);
}

// ── mappers ─────────────────────────────────────────────────────────────────

/**
 * The create form → `POST /matches` body. The form has a single "players"
 * number, so every slot is a regular slot; week days go from the form's
 * 0 = Sunday … 6 = Saturday to the API's ISO 1 = Monday … 7 = Sunday.
 */
export function toApiCreateMatch(
  input: CreateMatchInput,
  startsAt: string,
  coords: Coords,
): ApiCreateMatch {
  const recurring = input.type === 'Recurring';
  const isPrivate = input.privacy === 'private';
  return {
    name: input.name,
    description: null,
    address: input.location,
    latitude: coords.latitude,
    longitude: coords.longitude,
    dateTime: startsAt,
    maxPlayers: input.players,
    regularSlots: input.players,
    price: input.price > 0 ? input.price : null,
    type: input.type,
    frequency: recurring ? FREQUENCY_TO_API[input.recFreq] : null,
    dayOfWeek: null,
    format: input.format,
    level: LEVEL_TO_API[input.level],
    durationMinutes: toMinutes(input.duration),
    visibility: isPrivate ? 'Private' : 'Open',
    inviteMode: isPrivate ? (input.inviteMode === 'guests' ? 'Guests' : 'Code') : null,
    priceMonthly: recurring && input.priceMonthly > 0 ? input.priceMonthly : null,
    recurrenceDays: recurring
      ? input.recDays.map((day) => (day === 0 ? 7 : day)).sort((a, b) => a - b)
      : null,
    confirmationOpensHoursBefore: input.confirmationOpensHoursBefore,
  };
}

export function toUpcomingMatch(item: ApiMyMatch): UpcomingMatch {
  const level = toLevel(item.match.level);
  return {
    id: item.match.id,
    name: item.match.name,
    startsAt: item.match.dateTime,
    category: level === 'AVANCADO' ? 'COMPETITIVO' : 'CASUAL',
    openSlots: item.openSlots,
    priceLabel: formatPriceLabel(item.match.price),
    avatarUrls: item.confirmedPhotoUrls,
    tint: tintForLevel(level),
  };
}

export function toNearbyMatch(item: ApiNearbyMatch): NearbyMatch {
  const level = toLevel(item.level);
  return {
    id: item.id,
    name: item.name,
    format: toFormat(item.format),
    level,
    distanceKm: item.distanceKm,
    confirmed: item.confirmedCount,
    capacity: item.maxPlayers,
    priceLabel: formatPriceLabel(item.price),
    tint: tintForLevel(level),
    lat: item.latitude,
    lon: item.longitude,
    startsAt: item.dateTime,
  };
}

/**
 * `GET /matches/{id}/detail` → the S12 screen model, for the signed-in `userId`.
 *
 * Someone with no presence yet is shown as a pending Regular when they organize
 * the match (the organizer can always put themselves in), and as a non-participant
 * who may join otherwise.
 */
export function toMatchDetail(api: ApiMatchDetail, userId: string | null): MatchDetail {
  const { match, myPresence } = api;
  const level = toLevel(match.level);
  const isOrganizer = match.organizerId === userId;
  const windowOpen = match.status === 'Open';
  const waiting = api.myWaitingListPosition != null;
  const byCode = match.visibility === 'Private' && match.inviteMode === 'Code';
  const monthly = match.type === 'Recurring' && match.priceMonthly != null;

  let myParticipationType: ParticipationType | null = null;
  let myStatus: PresenceStatus | null = null;
  if (myPresence) {
    myParticipationType = myPresence.playerType === 'DropIn' ? 'DROPIN' : 'REGULAR';
    myStatus = STATUS_FROM_API[myPresence.status];
  } else if (isOrganizer) {
    myParticipationType = 'REGULAR';
    myStatus = 'PENDENTE';
  }

  // A drop-in who backed out can take a slot again.
  const canRejoin = myPresence?.playerType === 'DropIn' && myPresence.status !== 'Confirmed';
  const acceptingPlayers = windowOpen || match.status === 'Closed';

  const players: PresencePlayer[] = [
    ...api.players.map(({ player, status }) => ({
      id: player.userId,
      name: player.displayName,
      avatarUrl: player.photoUrl ?? undefined,
      status: STATUS_FROM_API[status],
      position: toPosition(player.position),
    })),
    ...api.guests.map((guest) => ({
      id: guest.id,
      name: guest.name,
      status: 'CONFIRMADO' as const,
      position: toPosition(guest.position),
      isGuest: true,
    })),
  ];

  return {
    id: match.id,
    name: match.name,
    format: toFormat(match.format),
    level,
    venue: match.address,
    // The detail endpoint is not relative to where the user is.
    distanceKm: 0,
    tint: tintForLevel(level),
    priceLabel: formatPriceLabel(match.price),
    pricePlan: monthly ? 'RECORRENTE' : 'AVULSO',
    priceMonthlyLabel: monthly ? formatPriceLabel(match.priceMonthly) : undefined,
    capacity: match.maxPlayers,
    startsAt: match.dateTime,
    confirmationClosesAt: match.windowClosesAt,
    confirmationWindowClosed: match.status !== 'Draft' && !windowOpen,
    organizerId: match.organizerId,
    organizer: {
      id: api.organizer.userId,
      name: api.organizer.displayName,
      avatarUrl: api.organizer.photoUrl ?? undefined,
      position: toPosition(api.organizer.position),
    },
    players,
    openDropInSlots: api.openSlots,
    myParticipationType,
    myStatus,
    teamConfig: {
      teamCount: 2,
      perTeam: Math.max(1, Math.floor(match.maxPlayers / 2)),
      drawMode: 'MANUAL',
    },
    canJoin: acceptingPlayers && !waiting && (api.canJoin || canRejoin),
    requiresInviteCode:
      acceptingPlayers && byCode && !myPresence && !isOrganizer && !waiting,
    inviteCode: api.inviteCode ?? undefined,
    myWaitingListPosition: api.myWaitingListPosition,
    game: toGameStage(api.game),
  };
}

function toGameStage(game: ApiMatchDetail['game']): MatchGameStage | null {
  if (!game) return null;
  if (game.hasSummary) return 'SUMMARY';
  return game.scoreboardState === 'Ended' ? 'VOTING' : 'LIVE';
}

// ── requests ────────────────────────────────────────────────────────────────

export function postMatch(body: ApiCreateMatch): Promise<ApiMatch> {
  return authorizedApiClient<ApiMatch>(MATCHES_PATH, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchMyMatches(): Promise<ApiMyMatch[]> {
  const { items } = await authorizedApiClient<{ items: ApiMyMatch[] }>(
    `${MATCHES_PATH}/mine`,
  );
  return items;
}

export async function fetchNearbyMatches(params: {
  lat: number;
  lon: number;
  radiusKm: number;
}): Promise<ApiNearbyMatch[]> {
  const { items } = await authorizedApiClient<{ items: ApiNearbyMatch[] }>(
    `${MATCHES_PATH}/nearby?lat=${params.lat}&lon=${params.lon}&radiusKm=${params.radiusKm}`,
  );
  return items;
}

export function fetchMatchDetail(id: string): Promise<ApiMatchDetail> {
  return authorizedApiClient<ApiMatchDetail>(`${MATCHES_PATH}/${id}/detail`);
}

export function putMyPresence(
  id: string,
  status: 'Confirmed' | 'Declined',
  inviteCode?: string,
): Promise<unknown> {
  return authorizedApiClient<unknown>(`${MATCHES_PATH}/${id}/presences/me`, {
    method: 'PUT',
    body: JSON.stringify({ status, inviteCode: inviteCode || null }),
  });
}

export function postGuest(
  id: string,
  guest: { name: string; position?: PlayerPosition },
): Promise<{ id: string; name: string; position: string | null }> {
  return authorizedApiClient(`${MATCHES_PATH}/${id}/guests`, {
    method: 'POST',
    body: JSON.stringify({ name: guest.name, position: guest.position ?? null }),
  });
}

/**
 * Turns a failed matches request into an `Error` whose message can be shown to
 * the user as-is. `messages` overrides the text for specific HTTP statuses.
 */
export function toMatchError(
  error: unknown,
  messages: Partial<Record<number, string>> = {},
): Error {
  if (error instanceof ApiError) {
    const specific = messages[error.status];
    if (specific) return new Error(specific);
    if (error.status === 401) return new Error('Sua sessão expirou. Entre novamente.');
    if (error.status === 404) return new Error('Essa partida não existe mais.');
    return new Error('Não foi possível concluir. Tente de novo.');
  }
  // fetch rejects with a TypeError when the request never reached the server.
  if (error instanceof TypeError) {
    return new Error('Sem conexão. Verifique sua internet e tente de novo.');
  }
  return error instanceof Error
    ? error
    : new Error('Não foi possível concluir. Tente de novo.');
}
