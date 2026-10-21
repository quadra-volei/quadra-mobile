import { getAccessToken } from '@/lib/auth/getAccessToken';
import { refreshSession } from '@/lib/auth/refreshSession';
import { freshAccessToken, joinMatchRoom, nextRetryDelay } from '@/lib/realtime/connection';

const mockConn = {
  state: 'Disconnected',
  start: jest.fn(async () => {
    mockConn.state = 'Connected';
  }),
  invoke: jest.fn(async () => {}),
  stop: jest.fn(async () => {}),
  onreconnected: jest.fn(),
};

jest.mock('@microsoft/signalr', () => {
  const builder = {
    withUrl: () => builder,
    withAutomaticReconnect: () => builder,
    withServerTimeout: () => builder,
    build: () => mockConn,
  };
  return {
    HubConnectionState: { Disconnected: 'Disconnected', Connected: 'Connected' },
    HttpTransportType: { WebSockets: 1 },
    HubConnectionBuilder: jest.fn(() => builder),
  };
});
jest.mock('@/lib/auth/getAccessToken', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/auth/refreshSession', () => ({ refreshSession: jest.fn() }));

const jwt = (exp: number) => `h.${btoa(JSON.stringify({ exp })).replace(/=+$/, '')}.s`;

describe('live-score connection', () => {
  it('keeps retrying forever, backing off to every 10 s', () => {
    expect([0, 1, 2, 3, 4, 5, 100].map(nextRetryDelay)).toEqual([0, 1000, 2000, 4000, 8000, 10000, 10000]);
  });

  it('sends the stored token while valid and renews it when about to expire', async () => {
    const valid = jwt(Date.now() / 1000 + 600);
    jest.mocked(getAccessToken).mockResolvedValueOnce(valid);
    await expect(freshAccessToken()).resolves.toBe(valid);

    jest.mocked(getAccessToken).mockResolvedValueOnce(jwt(Date.now() / 1000 + 30));
    jest.mocked(refreshSession).mockResolvedValueOnce('renewed');
    await expect(freshAccessToken()).resolves.toBe('renewed');
  });

  it('rejoins the match room and re-reads the game after a reconnect', async () => {
    const resync = jest.fn();
    await joinMatchRoom('m1', resync);
    mockConn.invoke.mockClear();

    const onReconnected = mockConn.onreconnected.mock.calls[0][0] as () => void;
    onReconnected();
    await new Promise(process.nextTick);

    expect(mockConn.invoke).toHaveBeenCalledWith('JoinMatchRoom', 'm1');
    expect(resync).toHaveBeenCalled();
  });
});
