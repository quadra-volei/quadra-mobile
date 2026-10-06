import * as signalR from '@microsoft/signalr';
import { getAccessToken } from '@/lib/auth/getAccessToken';

/**
 * Singleton SignalR connection for real-time match updates.
 *
 * Initialized lazily on first getConnection() call and reused across the app.
 * Automatically handles reconnection and cleanup.
 */
let connection: signalR.HubConnection | null = null;

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.quadra.dev';
const HUB_URL = `${BASE_URL}/hubs/match`;

/**
 * Gets or creates the SignalR connection to the match hub.
 *
 * MOCK: this iteration ships with a placeholder implementation. The connection
 * URL and hub path (HUB_URL) are mocked. In real use, once the backend match
 * SignalR hub lands, swap the BASE_URL / HUB_URL to point to the real endpoint
 * and the connection will work unchanged.
 *
 * Usage:
 * ```tsx
 * const conn = await getConnection();
 * await conn.invoke('JoinMatchRoom', matchId);
 * conn.on('ScoreUpdated', handler);
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
