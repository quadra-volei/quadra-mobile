import * as signalR from '@microsoft/signalr';
import { getAccessToken } from '@/lib/auth/getAccessToken';

/**
 * Singleton SignalR connection for real-time match updates.
 *
 * Initialized lazily on first getConnection() call and reused across the app.
 * Automatically handles reconnection and cleanup.
 */
let connection: signalR.HubConnection | null = null;

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const HUB_URL = `${BASE_URL}/hubs/match`;

/**
 * Gets or creates the SignalR connection to the match hub.
 *
 * One shared connection to the backend hub at `${EXPO_PUBLIC_API_URL}/hubs/match`,
 * authenticated with the access token.
 *
 * Usage:
 * ```tsx
 * const conn = await getConnection();
 * await conn.invoke('JoinMatchRoom', matchId);
 * conn.on('ScoreboardUpdated', handler);
 * ```
 */
export async function getConnection(): Promise<signalR.HubConnection> {
  // Return existing connection if already connected
  if (
    connection &&
    connection.state === signalR.HubConnectionState.Connected
  ) {
    return connection;
  }

  // Create a fresh connection if needed
  if (!connection) {
    try {
      const token = await getAccessToken();

      connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          accessTokenFactory: () => token || '',
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect([0, 1000, 2000, 5000, 10000]) // Exponential backoff
        .withServerTimeout(30000)
        .build();

      await connection.start();
    } catch (err) {
      connection = null;
      throw err;
    }
  }

  return connection;
}

/**
 * Disconnects the SignalR connection.
 */
export async function disconnectConnection(): Promise<void> {
  if (connection) {
    try {
      await connection.stop();
    } catch {
      // Suppress errors on disconnect
    }
    connection = null;
  }
}

/**
 * Resets the connection (used for logout or when the token expires).
 */
export function resetConnection(): void {
  connection = null;
}
