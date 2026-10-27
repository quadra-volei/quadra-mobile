import Svg, { Polygon } from 'react-native-svg';

import { CHAMFER_OUTER } from '@/components/domain/PlayerCard';
import { CARD_H, CARD_W, PIECE_COUNT, PIECE_ORDER, piecePoints } from '@/features/pass/lib/cardPieces';
import { PIECE_COVER } from '@/theme/cardFinish';

const LIME = PIECE_COVER.next;

/**
 * A small outline of the season card cut into its 12 pieces (API DECISIONS #98):
 * the pieces won in lime, the rest as glass. With `highlight`, only that piece
 * stands out (lime when won, a lime outline while it is not).
 */
export function CardPiecesMini({
  collected,
  highlight,
  width = 30,
  tone = 'dark',
}: {
  /** Pieces won, in the pass's order. */
  collected: number;
  highlight?: number;
  width?: number;
  tone?: 'dark' | 'light';
}) {
  const won = new Set<number>(PIECE_ORDER.slice(0, Math.min(collected, PIECE_COUNT)));
  const line = PIECE_COVER.miniLine[tone];
  const glass = PIECE_COVER.miniGlass[tone];
  return (
    <Svg width={width} height={(width * CARD_H) / CARD_W} viewBox={`0 0 ${CARD_W} ${CARD_H}`}>
      {PIECE_ORDER.map((p) => {
        const on = highlight == null ? won.has(p) : p === highlight && won.has(p);
        const ring = highlight != null && p === highlight && !won.has(p);
        return (
          <Polygon
            key={p}
            points={piecePoints(p)}
            fill={on ? LIME : glass}
            fillOpacity={highlight != null && !on && p !== highlight ? 0.5 : 1}
            stroke={ring ? LIME : line}
            strokeWidth={ring ? 14 : 6}
          />
        );
      })}
      <Polygon points={CHAMFER_OUTER} fill="none" stroke={line} strokeWidth={10} />
    </Svg>
  );
}
