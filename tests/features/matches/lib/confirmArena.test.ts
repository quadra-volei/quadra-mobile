import { dialog } from '@/components/ui/Dialog';
import { confirmArenaAt } from '@/features/matches/lib/confirmArena';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

jest.mock('@/lib/api/authorizedClient', () => ({ authorizedApiClient: jest.fn() }));
jest.mock('@/components/ui/Dialog', () => ({ dialog: { alert: jest.fn() } }));

const api = authorizedApiClient as jest.Mock;
const alert = dialog.alert as jest.Mock;
const SPOT = { latitude: -23.5505, longitude: -46.6333 };
const arena = (over: Partial<{ id: string; placeId: string | null; linked: boolean }> = {}) => ({
  id: 'arena-1',
  placeId: 'ChIJarena',
  distanceMeters: 40,
  kind: 'Court',
  linked: false,
  ...over,
});

/** Answers `GET /arenas/near` with `items` and `GET /places/{id}` with the arena's name. */
function answer(items: ReturnType<typeof arena>[]) {
  api.mockImplementation(async (path: string) =>
    path.startsWith('/api/v1/arenas/near') ? { items } : { title: 'CERET', address: 'Rua X' },
  );
}

beforeEach(() => {
  api.mockReset();
  alert.mockReset();
});

describe('confirmArenaAt', () => {
  it('asks "É no …?" for an approved arena nearby and links it only on "Sim"', async () => {
    answer([arena()]);
    const onConfirm = jest.fn();

    await confirmArenaAt(SPOT, 'ChIJstreet', onConfirm);

    expect(api.mock.calls[0]![0]).toBe('/api/v1/arenas/near?lat=-23.5505&lon=-46.6333&placeId=ChIJstreet');
    expect(alert).toHaveBeenCalledTimes(1);
    const [title, , buttons] = alert.mock.calls[0]!;
    expect(title).toBe('É no CERET?');
    expect(onConfirm).not.toHaveBeenCalled();
    buttons.find((b: { text: string }) => b.text === 'Sim').onPress();
    expect(onConfirm).toHaveBeenCalledWith('arena-1');
  });

  it('does not ask when the picked place is the arena itself: the API links it', async () => {
    answer([arena({ linked: true })]);

    await confirmArenaAt(SPOT, 'ChIJarena', jest.fn());

    expect(alert).not.toHaveBeenCalled();
  });

  it('does not ask with no approved arena nearby, without a name, or when the API fails', async () => {
    answer([]);
    await confirmArenaAt(SPOT, 'ChIJstreet', jest.fn());
    answer([arena({ placeId: null })]);
    await confirmArenaAt(SPOT, 'ChIJstreet', jest.fn());
    api.mockRejectedValue(new Error('offline'));
    await confirmArenaAt(SPOT, 'ChIJstreet', jest.fn());

    expect(alert).not.toHaveBeenCalled();
  });
});
