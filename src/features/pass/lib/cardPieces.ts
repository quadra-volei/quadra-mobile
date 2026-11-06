// The season card in pieces (API DECISIONS #98): the card is cut into 12 shards,
// a 3 × 4 grid whose cuts lean like cracks in glass. Each level of the pass gives
// one piece; the order goes from the corners to the middle, so the face and the
// name are the last to show.

/** The card's drawing grid (PlayerCard): 292 × 406. */
export const CARD_W = 292;
export const CARD_H = 406;

export const PIECE_COUNT = 12;

type Point = { x: number; y: number };
// A cut across the card: "down" from (top, 0) to (bottom, H); "across" from (0, left) to (W, right).
type Down = { top: number; bottom: number };
type Across = { left: number; right: number };

// The card's edges and the cuts between them, alternating their lean.
const DOWN: Down[] = [
  { top: 0, bottom: 0 },
  { top: 108, bottom: 86 },
  { top: 184, bottom: 206 },
  { top: CARD_W, bottom: CARD_W },
];
const ACROSS: Across[] = [
  { left: 0, right: 0 },
  { left: 112, right: 90 },
  { left: 192, right: 214 },
  { left: 312, right: 296 },
  { left: CARD_H, right: CARD_H },
];

/** Where a down cut meets an across cut. */
function meet(d: Down, a: Across): Point {
  const dx = d.bottom - d.top;
  const dy = a.right - a.left;
  const x = (d.top + (dx * a.left) / CARD_H) / (1 - (dx * dy) / (CARD_H * CARD_W));
  return { x, y: a.left + (dy * x) / CARD_W };
}

/** Each piece's corners (clockwise from the top left), row by row: 0–2 the top row, 9–11 the bottom one. */
export const PIECES: Point[][] = Array.from({ length: PIECE_COUNT }, (_, i) => {
  const row = Math.floor(i / 3);
  const col = i % 3;
  return [
    meet(DOWN[col]!, ACROSS[row]!),
    meet(DOWN[col + 1]!, ACROSS[row]!),
    meet(DOWN[col + 1]!, ACROSS[row + 1]!),
    meet(DOWN[col]!, ACROSS[row + 1]!),
  ];
});

/** SVG `points` of a piece. */
export function piecePoints(index: number): string {
  return PIECES[index]!.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

/** The middle of a piece, for its number. */
export function pieceCenter(index: number): Point {
  const corners = PIECES[index]!;
  return {
    x: corners.reduce((sum, p) => sum + p.x, 0) / corners.length,
    y: corners.reduce((sum, p) => sum + p.y, 0) / corners.length,
  };
}

/** Which piece each level gives: the corners first, then the edges, the face last. */
export const PIECE_ORDER = [0, 11, 2, 9, 3, 8, 5, 6, 10, 1, 7, 4] as const;

/** The piece level `level` (1–12) gives. */
export function pieceOfLevel(level: number): number {
  return PIECE_ORDER[level - 1]!;
}

/** The pieces still missing with `collected` pieces, in the order they come. */
export function missingPieces(collected: number): number[] {
  return PIECE_ORDER.slice(Math.max(0, Math.min(collected, PIECE_COUNT)));
}
