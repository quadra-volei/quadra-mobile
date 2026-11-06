// How a recurring match gives points (quadra-api DECISIONS #95), for the ranking's
// "Como pontuar" and the season pass. `badge` is the number on the left; MVP rows
// take the lime highlight.
export const POINT_RULES: { badge: string; title: string; detail: string; mvp?: boolean }[] = [
  { badge: '+10', title: 'Presença', detail: 'Cada partida recorrente que você joga. Partidas avulsas não contam.' },
  { badge: '+8', title: 'Jogo ganho', detail: 'Por jogo que o seu time vence no placar, até 3 por partida.' },
  { badge: '+4', title: 'Voto de MVP', detail: 'Por voto que você recebe de quem jogou com você.', mvp: true },
  { badge: '+20', title: 'MVP do dia', detail: 'O mais votado da partida, quando ela tem 3 votos ou mais.', mvp: true },
];
