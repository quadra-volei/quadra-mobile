/**
 * S12 — presence data-layer tests (`src/features/matches/api/presence.ts` +
 * the `mergeMyPresence` half of `getMatchDetail.ts`).
 *
 * The screen mocks these hooks at the boundary; here we run the REAL mocked
 * implementations to cover the data-layer half of the presence criteria:
 *  - useConfirmPresence / useDeclinePresence / useJoinMatch each resolve a stub
 *    `{ match: { id } }` echoing the match id, with no network;
 *  - on success each invalidates BOTH the match-detail query
 *    (['matches', id, 'detail']) and the broader ['matches'] key (so S5 Home and
 *    this screen refresh);
 *  - each records the new presence in the session `presenceStore`, which is what
 *    makes the write mean something while F1.4 is mocked;
 *  - `useMatchDetail` merges that store, so presence IS confirmed-list
 *    membership: CONFIRMADO puts the user in `players` and takes a slot;
 *    RECUSADO takes them back out and frees it. This holds for the organizer too.
 *
 * Covers: S12 — Match Detail
 * Criterion: "tapping it calls useConfirmPresence / useDeclinePresence /
 *  useJoinMatch (mocked) ... and invalidates the match detail query"; and
 *  "confirming enters the confirmed list, declining removes from it".
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import { useMatchDetail } from '@/features/matches/api/getMatchDetail';
import {
  useConfirmPresence,
  useDeclinePresence,
  useJoinMatch,
} from '@/features/matches/api/presence';
import { useAuthStore } from '@/stores/auth';
import { usePresenceStore } from '@/stores/presenceStore';

const MATCH_ID = 'near-1';
const VIEWER_ID = 'user-viewer';

let client: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  usePresenceStore.getState().reset();
  useAuthStore.setState({ userId: VIEWER_ID });
});

const CASES = [
  ['useConfirmPresence', useConfirmPresence],
  ['useDeclinePresence', useDeclinePresence],
  ['useJoinMatch', useJoinMatch],
] as const;

describe('S12 — presence mutations (mock)', () => {
  it.each(CASES)('%s resolves a stub echoing the match id', async (_name, hook) => {
    const { result } = await renderHook(() => hook(MATCH_ID), { wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.match.id).toBe(MATCH_ID);
  });

  it.each(CASES)(
    '%s invalidates the match-detail query and the ["matches"] key on success',
    async (_name, hook) => {
      const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

      const { result } = await renderHook(() => hook(MATCH_ID), { wrapper });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['matches', MATCH_ID, 'detail'],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['matches'] });
    },
  );

  /**
   * Covers: S12 — Match Detail
   * Criterion: the mutation records the presence that the read layer merges —
   *  without this the invalidation would refetch an unchanged fixture.
   */
  it('records the resulting presence in the session store', async () => {
    const confirm = await renderHook(() => useConfirmPresence(MATCH_ID), {
      wrapper,
    });
    await act(async () => {
      confirm.result.current.mutate();
    });
    await waitFor(() => expect(confirm.result.current.isSuccess).toBe(true));
    expect(usePresenceStore.getState().getPresence(MATCH_ID)).toEqual({
      status: 'CONFIRMADO',
    });

    const decline = await renderHook(() => useDeclinePresence(MATCH_ID), {
      wrapper,
    });
    await act(async () => {
      decline.result.current.mutate();
    });
    await waitFor(() => expect(decline.result.current.isSuccess).toBe(true));
    expect(usePresenceStore.getState().getPresence(MATCH_ID)).toEqual({
      status: 'RECUSADO',
    });
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: joining an open drop-in slot promotes participation to DROPIN, so
   *  the join CTA does not reappear after joining.
   */
  it('marks a drop-in join as DROPIN participation', async () => {
    const { result } = await renderHook(() => useJoinMatch(MATCH_ID), {
      wrapper,
    });
    await act(async () => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(usePresenceStore.getState().getPresence(MATCH_ID)).toEqual({
      status: 'CONFIRMADO',
      participation: 'DROPIN',
    });
  });
});

// ── mergeMyPresence: presence IS confirmed-list membership ───────────────────

async function readDetail(id = MATCH_ID) {
  const { result } = await renderHook(() => useMatchDetail(id, { latencyMs: 0 }), {
    wrapper,
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result.current.data!;
}

describe('S12 — presence drives confirmed-list membership', () => {
  /**
   * Covers: S12 — Match Detail
   * Criterion: with no presence recorded this session, the payload's own status
   *  stands and the user is not in the grid.
   */
  it('leaves the payload untouched when the user has not acted', async () => {
    const detail = await readDetail();

    expect(detail.players.map((p) => p.id)).not.toContain(VIEWER_ID);
    expect(detail.myStatus).toBe('PENDENTE');
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: "confirming enters the confirmed list" — and takes a slot.
   */
  it('adds the user to players and consumes a slot once CONFIRMADO', async () => {
    const before = await readDetail();
    usePresenceStore
      .getState()
      .setPresence(MATCH_ID, { status: 'CONFIRMADO' });
    client.clear();

    const after = await readDetail();

    expect(after.players.map((p) => p.id)).toContain(VIEWER_ID);
    expect(after.players).toHaveLength(before.players.length + 1);
    expect(after.myStatus).toBe('CONFIRMADO');
    expect(after.openDropInSlots).toBe(before.openDropInSlots - 1);
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: "'não vou poder ir' removes the player from the confirmed list"
   *  — including after they had confirmed, freeing the slot again.
   */
  it('removes a previously confirmed user from players and frees the slot', async () => {
    const baseline = await readDetail();

    usePresenceStore
      .getState()
      .setPresence(MATCH_ID, { status: 'CONFIRMADO' });
    client.clear();
    const confirmed = await readDetail();
    expect(confirmed.players.map((p) => p.id)).toContain(VIEWER_ID);

    usePresenceStore.getState().setPresence(MATCH_ID, { status: 'RECUSADO' });
    client.clear();
    const declined = await readDetail();

    expect(declined.players.map((p) => p.id)).not.toContain(VIEWER_ID);
    expect(declined.players).toHaveLength(baseline.players.length);
    expect(declined.myStatus).toBe('RECUSADO');
    expect(declined.openDropInSlots).toBe(baseline.openDropInSlots);
  });

  /**
   * Covers: S12 — Match Detail
   * Criterion: organizing is not playing — the organizer is absent from the grid
   *  until they confirm, and can take themselves back out.
   */
  it('keeps the organizer out of the grid until they confirm', async () => {
    useAuthStore.setState({ userId: 'user-organizer' });

    const before = await readDetail('mine-1');
    expect(before.players.map((p) => p.id)).not.toContain('user-organizer');
    expect(before.myStatus).toBe('PENDENTE');

    usePresenceStore.getState().setPresence('mine-1', { status: 'CONFIRMADO' });
    client.clear();
    const after = await readDetail('mine-1');

    expect(after.players.map((p) => p.id)).toContain('user-organizer');
    expect(after.players).toHaveLength(before.players.length + 1);
  });
});
