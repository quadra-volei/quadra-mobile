import type { Position } from '@/features/profile/schema/onboarding';

// Identity titles for the card (API CardTitles). Cosmetic: they are not a
// technical rating. The API stores the code; the wording lives here.
export type CardTitleCode = 'MAESTRO' | 'LANCEIRO' | 'DEFENSOR' | 'MURALHA' | 'CORINGA' | 'SAQUE_DE_FERRO';

export const CARD_TITLES: { code: CardTitleCode; name: string; description: string }[] = [
  { code: 'MAESTRO', name: 'O Maestro', description: 'O ritmo do jogo passa pelas suas mãos.' },
  { code: 'LANCEIRO', name: 'O Lanceiro', description: 'Precisão para atravessar qualquer bloqueio.' },
  { code: 'DEFENSOR', name: 'O Defensor', description: 'Nenhuma bola cai sem uma tentativa.' },
  { code: 'MURALHA', name: 'A Muralha', description: 'Fechando a rede. Abrindo caminhos.' },
  { code: 'CORINGA', name: 'O Coringa', description: 'Toda posição. Sempre pelo time.' },
  { code: 'SAQUE_DE_FERRO', name: 'Saque de Ferro', description: 'A primeira pressão começa no saque.' },
];

// Until the player picks one, the title follows the position.
const BY_POSITION: Record<Position, CardTitleCode> = {
  LEV: 'MAESTRO',
  PON: 'LANCEIRO',
  OPO: 'LANCEIRO',
  LIB: 'DEFENSOR',
  CEN: 'MURALHA',
  COR: 'CORINGA',
};

/** The title shown on the card: the chosen one, else the position's. */
export function cardTitleCode(chosen: CardTitleCode | null | undefined, position?: Position): CardTitleCode {
  return chosen ?? (position ? BY_POSITION[position] : 'CORINGA');
}

export function cardTitleName(code: CardTitleCode): string {
  return CARD_TITLES.find((t) => t.code === code)?.name ?? 'O Coringa';
}
