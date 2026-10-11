import { describe, expect, it } from 'vitest';
import {
  cells,
  clearLines,
  collides,
  COLS,
  createBag,
  createBoard,
  dropDistance,
  fullRows,
  gravityInterval,
  levelFor,
  lock,
  ROWS,
  scoreForLines,
  spawn,
  tryMove,
  tryRotate,
  TYPES,
  type Board,
  type Point,
} from '../src/games/blocks/logic';
import { seeded } from './helpers';

const sorted = (pts: Point[]) => [...pts].sort((a, b) => a.y - b.y || a.x - b.x);

describe('blocks rotation', () => {
  it('every piece has four cells in every rotation', () => {
    for (const t of TYPES) for (let r = 0; r < 4; r++) expect(cells(t, r)).toHaveLength(4);
  });

  it('rotating four times returns to the original shape', () => {
    for (const t of TYPES) expect(sorted(cells(t, 4))).toEqual(sorted(cells(t, 0)));
  });

  it('rotates T clockwise to point right', () => {
    expect(sorted(cells('T', 1))).toEqual(
      sorted([
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
      ]),
    );
  });

  it('I becomes vertical after one rotation', () => {
    const xs = new Set(cells('I', 1).map((c) => c.x));
    expect(xs.size).toBe(1);
  });

  it('O does not rotate', () => {
    expect(tryRotate(createBoard(), spawn('O'), 1)).toBeNull();
  });

  it('kicks away from the wall when rotation would collide', () => {
    const board = createBoard();
    const vertical = { type: 'I' as const, rot: 1, x: -2, y: 5 };
    expect(collides(board, vertical)).toBe(false);
    const rotated = tryRotate(board, vertical, 1);
    expect(rotated).not.toBeNull();
    expect(collides(board, rotated!)).toBe(false);
    expect(rotated!.x).toBeGreaterThan(-2);
  });

  it('fails to rotate when every kick is blocked', () => {
    const board: Board = createBoard().map(() => Array(COLS).fill('O'));
    const piece = { type: 'T' as const, rot: 0, x: 3, y: 0 };
    board[0][4] = null;
    board[1][3] = null;
    board[1][4] = null;
    board[1][5] = null;
    expect(collides(board, piece)).toBe(false);
    expect(tryRotate(board, piece, 1)).toBeNull();
  });
});

describe('blocks movement and locking', () => {
  it('spawns pieces centred at the top', () => {
    expect(spawn('I')).toEqual({ type: 'I', rot: 0, x: 3, y: -1 });
    expect(spawn('O').x).toBe(4);
    expect(spawn('T').x).toBe(3);
  });

  it('cannot move through the walls', () => {
    const board = createBoard();
    let p = spawn('O');
    for (let i = 0; i < 10; i++) p = tryMove(board, p, -1, 0) ?? p;
    expect(p.x).toBe(0);
    expect(tryMove(board, p, -1, 0)).toBeNull();
  });

  it('computes hard drop distance to the floor', () => {
    expect(dropDistance(createBoard(), spawn('O'))).toBe(ROWS - 2);
  });

  it('reports top out when locking above the field', () => {
    const { toppedOut } = lock(createBoard(), { type: 'I', rot: 1, x: 3, y: -2 });
    expect(toppedOut).toBe(true);
  });
});

describe('blocks line clears', () => {
  const fill = (board: Board, rows: number[]) => {
    for (const y of rows) board[y] = Array(COLS).fill('L');
    return board;
  };

  it.each([1, 2, 3, 4])('clears %i full lines', (n) => {
    const rows = Array.from({ length: n }, (_, i) => ROWS - 1 - i);
    const board = fill(createBoard(), rows);
    board[ROWS - 1 - n][0] = 'T';
    expect(fullRows(board)).toEqual([...rows].sort((a, b) => a - b));
    const result = clearLines(board);
    expect(result.cleared).toBe(n);
    expect(result.board).toHaveLength(ROWS);
    expect(result.board[ROWS - 1][0]).toBe('T');
    expect(result.board[ROWS - 1].filter(Boolean)).toHaveLength(1);
  });

  it('scores by lines and level', () => {
    expect(scoreForLines(1, 1)).toBe(100);
    expect(scoreForLines(2, 1)).toBe(300);
    expect(scoreForLines(3, 2)).toBe(1000);
    expect(scoreForLines(4, 5)).toBe(4000);
  });

  it('levels up every ten lines', () => {
    expect(levelFor(1, 9)).toBe(1);
    expect(levelFor(1, 10)).toBe(2);
    expect(levelFor(5, 25)).toBe(7);
  });

  it('gravity follows the spec formula with a floor', () => {
    expect(gravityInterval(1)).toBeCloseTo(0.8);
    expect(gravityInterval(5)).toBeCloseTo(0.52);
    expect(gravityInterval(10)).toBeCloseTo(0.17);
    expect(gravityInterval(30)).toBe(0.05);
  });
});

describe('7-bag randomiser', () => {
  it('deals each of the seven pieces exactly once per bag', () => {
    const next = createBag(seeded(7));
    for (let round = 0; round < 5; round++) {
      const bag = Array.from({ length: 7 }, () => next());
      expect(new Set(bag).size).toBe(7);
    }
  });
});
