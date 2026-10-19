import { inviteLink } from '@/lib/inviteLink';
import { setPendingLink, takePendingLink } from '@/lib/pendingLink';

describe('invite link', () => {
  it('is the https page of the match, with the code of a private match', () => {
    expect(inviteLink('m-1')).toBe('https://quadra-volei.app/p/m-1');
    expect(inviteLink('m-1', 'AB2C3D4E')).toBe('https://quadra-volei.app/p/m-1?c=AB2C3D4E');
    expect(inviteLink('m-1', null)).toBe('https://quadra-volei.app/p/m-1');
  });

  it('keeps a link opened while signed out for one later read', () => {
    expect(takePendingLink()).toBeNull();
    setPendingLink({ pathname: '/matches/[id]', params: { id: 'm-1', c: 'AB2C3D4E' } });
    expect(takePendingLink()).toEqual({ pathname: '/matches/[id]', params: { id: 'm-1', c: 'AB2C3D4E' } });
    expect(takePendingLink()).toBeNull();
  });
});
