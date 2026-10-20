import { type Activity, describeActivity } from '@/features/activity/api/activityApi';

const NOW = Date.parse('2026-10-14T20:42:00Z');

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: 'a',
    type: 'MatchStarted',
    actor: { userId: 'bia', displayName: 'Bia', handle: 'bia', photoUrl: null, level: 9 },
    match: { id: 'm-1', name: 'Racha da Galera' },
    othersCount: 0,
    outcome: null,
    setsWon: null,
    setsLost: null,
    levelFrom: null,
    levelTo: null,
    occurredAt: '2026-10-14T20:42:00Z',
    ...overrides,
  };
}

const sentence = (a: Activity) => describeActivity(a, NOW).parts.map((p) => p.text).join('');

describe('describeActivity', () => {
  it('a started game is live and opens the match', () => {
    const line = describeActivity(activity({}), NOW);

    expect(sentence(activity({}))).toBe('Bia iniciou uma partida Racha da Galera');
    expect(line.caption).toBe('A partida está rolando agora · agora');
    expect(line.icon).toBe('live');
    expect(line.target).toEqual({ pathname: '/matches/[id]', id: 'm-1' });
    expect(line.parts.map((p) => p.kind)).toEqual(['name', 'plain', 'object']);
  });

  it('groups the other friends in the same game', () => {
    expect(sentence(activity({ othersCount: 2 }))).toBe('Bia e mais 2 iniciaram uma partida Racha da Galera');
  });

  it('a finished game tells the result, winner sets first', () => {
    const win = activity({ type: 'MatchEnded', outcome: 'Win', setsWon: 2, setsLost: 1, occurredAt: '2026-10-14T20:00:00Z' });
    const loss = activity({ type: 'MatchEnded', outcome: 'Loss', setsWon: 0, setsLost: 1 });

    expect(sentence(win)).toBe('Bia terminou uma partida Racha da Galera');
    expect(describeActivity(win, NOW).caption).toBe('Vitória por 2 sets a 1 · há 42 min');
    expect(describeActivity(loss, NOW).caption).toBe('Derrota por 1 set a 0 · agora');
    expect(describeActivity(activity({ type: 'MatchEnded', outcome: 'Draw' }), NOW).caption).toBe('Empate · agora');
    expect(describeActivity(win, NOW).icon).toBe('finished');
  });

  it('the MVP highlights MVP and the match', () => {
    const line = describeActivity(activity({ type: 'MvpAwarded' }), NOW);

    expect(sentence(activity({ type: 'MvpAwarded' }))).toBe('Bia foi o MVP de Racha da Galera');
    expect(line.parts.filter((p) => p.kind === 'object').map((p) => p.text)).toEqual(['MVP', 'Racha da Galera']);
    expect(line.icon).toBe('mvp');
  });

  it('a level up names the new level and opens the friend', () => {
    const levelUp = activity({ type: 'LevelUp', match: null, levelFrom: 15, levelTo: 16 });
    const line = describeActivity(levelUp, NOW);

    expect(sentence(levelUp)).toBe('Bia subiu para o nível 16');
    expect(line.caption).toBe('Novo nível desbloqueado · agora');
    expect(line.target).toEqual({ pathname: '/players/[id]', id: 'bia' });
  });
});
