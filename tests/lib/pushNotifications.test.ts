import { pushTarget } from '@/lib/push/pushNotifications';

describe('push target', () => {
  it('opens the screen the notification is about', () => {
    expect(pushTarget({ type: 'SummaryReady', matchId: 'm1' })).toEqual({ pathname: '/matches/[id]/summary', params: { id: 'm1' } });
    expect(pushTarget({ type: 'MvpVotingOpen', matchId: 'm1' })).toEqual({ pathname: '/matches/[id]/mvp-vote', params: { id: 'm1' } });
    expect(pushTarget({ type: 'WaitingListSpot', matchId: 'm1' })).toEqual({ pathname: '/matches/[id]', params: { id: 'm1' } });
    expect(pushTarget({ type: 'SummaryReady', matchId: null })).toBeNull();
    expect(pushTarget(undefined)).toBeNull();
  });
});
