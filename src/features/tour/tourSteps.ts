/**
 * The first-access tour (DECISIONS #190): a welcome card, then one highlight
 * per tab bar item, without leaving the Home. Raise `TOUR_VERSION` when the
 * steps change enough to show the tour again to everyone.
 */
export const TOUR_VERSION = 1;

/** Tab bar items the tour highlights; each registers itself with `useTourTarget`. */
export type TourTargetId = 'create' | 'explore' | 'network' | 'profile';

export type TourStep = { target: TourTargetId; title: string; body: string };

export const TOUR_STEPS: readonly TourStep[] = [
  {
    target: 'create',
    title: 'Crie e chame a galera',
    body: 'Aqui você cria uma partida e convida quem joga com você, ou publica na Rede.',
  },
  {
    target: 'explore',
    title: 'Jogos perto de você',
    body: 'Partidas abertas na sua região. Achou uma, peça sua vaga.',
  },
  {
    target: 'network',
    title: 'Sua rede',
    body: 'Siga quem joga com você e veja o que a galera anda jogando.',
  },
  {
    target: 'profile',
    title: 'Sua carta',
    body: 'Sua carta de jogador evolui a cada partida e entra no ranking.',
  },
];
