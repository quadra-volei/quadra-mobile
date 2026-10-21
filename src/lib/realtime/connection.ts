import * as signalR from '@microsoft/signalr';
import { getAccessToken } from '@/lib/auth/getAccessToken';
import { refreshSession } from '@/lib/auth/refreshSession';

/**
 * Singleton SignalR connection for real-time match updates.
 *
 * Initialized lazily on first getConnection() call and reused across the app.
 * It never gives up reconnecting (the phone at the court locks its screen and
 * loses signal all the time), sends a fresh access token on every attempt, and
 * after a reconnect rejoins the match rooms, which the server forgets with the
 * old connection.
 */
let connection: signalR.HubConnection | null = null;
let starting: Promise<void> | null = null;

/** Rooms this app is in, each with what to run once a reconnect rejoins it. */
const rooms = new Map<string, () => void>();

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const HUB_URL = `${BASE_URL}/hubs/match`;

/** 0, 1, 2, 4, 8 s, then every 10 s, forever. */
export function nextRetryDelay(previousRetryCount: number): number {
  return previousRetryCount === 0 ? 0 : Math.min(1000 * 2 ** (previousRetryCount - 1), 10_000);
}

/** True when the JWT is unreadable or expires within a minute. */
function expiresSoon(token: string): boolean {
  try {
    const payload = (token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))) as { exp?: number };
    return !exp || exp * 1000 - Date.now() < 60_000;
  } catch {
    return true;
  }
}

/** The stored access token, renewed first when it is about to expire (it lives 15 min). */
export async function freshAccessToken(): Promise<string> {
  const token = await getAccessToken();
  return token && !expiresSoon(token) ? token : refreshSession();
}

function build(): signalR.HubConnection {
  const conn = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: freshAccessToken,
      skipNegotiation: false,
      transport: signalR.HttpTransportType.WebSockets,
    })
    .withAutomaticReconnect({ nextRetryDelayInMilliseconds: (ctx) => nextRetryDelay(ctx.previousRetryCount) })
    .withServerTimeout(30000)
    .build();

  conn.onreconnected(() => {
    for (const [matchId, resync] of rooms) {
      // Points scored while offline were missed: re-read the game after rejoining.
      void conn.invoke('JoinMatchRoom', matchId).then(resync, () => {});
    }
  });
  return conn;
}

/**
 * Gets the connection to the match hub at `${EXPO_PUBLIC_API_URL}/hubs/match`,
 * starting it (again, if it was stopped) when needed.
 *
 * Usage:
 * ```tsx
 * const conn = await getConnection();
 * await joinMatchRoom(matchId, refetch);
 * conn.on('ScoreboardUpdated', handler);
 * ```
 */
export async function getConnection(): Promise<signalR.HubConnection> {
  connection ??= build();
  const conn = connection;
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    starting ??= conn.start().finally(() => {
      starting = null;
    });
  }
  await starting;
  return conn;
}

/** Joins a match room and keeps it across reconnects; `resync` runs after each rejoin. */
export async function joinMatchRoom(matchId: string, resync: () => void): Promise<void> {
  const conn = await getConnection();
  rooms.set(matchId, resync);
  try {
    await conn.invoke('JoinMatchRoom', matchId);
  } catch (err) {
    rooms.delete(matchId);
    throw err;
  }
}

export function leaveMatchRoom(matchId: string): void {
  rooms.delete(matchId);
  void connection?.invoke('LeaveMatchRoom', matchId).catch(() => {});
}

/**
 * Disconnects the SignalR connection (logout: the next account gets its own).
 */
export async function disconnectConnection(): Promise<void> {
  rooms.clear();
  if (connection) {
    const conn = connection;
    connection = null;
    try {
      await conn.stop();
    } catch {
      // Suppress errors on disconnect
    }
  }
}
