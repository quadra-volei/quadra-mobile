import { CARD_H, CARD_W, PIECES, PIECE_COUNT, PIECE_ORDER, missingPieces, pieceOfLevel } from '@/features/pass/lib/cardPieces';

// The season card's 12 pieces (API DECISIONS #98): they tile the card and come in a fixed order.
describe('season card pieces', () => {
  it('gives each of the 12 pieces once, the face (the middle) last', () => {
    expect([...PIECE_ORDER].sort((a, b) => a - b)).toEqual(Array.from({ length: PIECE_COUNT }, (_, i) => i));
    expect(pieceOfLevel(1)).toBe(0);
    expect(pieceOfLevel(PIECE_COUNT)).toBe(4);
  });

  it('cuts the card with no gap: neighbours share their corners and the outer ones touch the edges', () => {
    const near = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;
    for (let i = 0; i < PIECE_COUNT; i++) {
      const [tl, tr, br] = PIECES[i]!;
      if (i % 3 < 2) expect(near(tr!, PIECES[i + 1]![0]!)).toBe(true); // right neighbour
      if (i < 9) expect(near(br!, PIECES[i + 3]![1]!)).toBe(true); // piece below
      for (const p of PIECES[i]!) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(CARD_W);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(CARD_H);
      }
      expect(tl).toBeDefined();
    }
    expect(PIECES[0]![0]).toEqual({ x: 0, y: 0 });
    expect(PIECES[11]![2]).toEqual({ x: CARD_W, y: CARD_H });
  });

  it('lists what is still missing, in the order it comes', () => {
    expect(missingPieces(0)).toEqual([...PIECE_ORDER]);
    expect(missingPieces(10)).toEqual([7, 4]);
    expect(missingPieces(PIECE_COUNT)).toEqual([]);
    expect(missingPieces(99)).toEqual([]);
  });
});
