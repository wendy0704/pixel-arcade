import { describe, expect, it } from 'vitest';
import { canMove, createGrid, maxTile, move, slideLine, spawnTile, tileLayout } from '../src/games/merge/logic';
import { approach, createState, flip, hideMismatch, isComplete, boardSize } from '../src/games/memory/logic';
import { bestMove, chooseMove, createBoard, isDraw, minimax, seriesScore, winner, type Cell } from '../src/games/tictactoe/logic';
import { HEIGHT, MAX_ANGLE, nextSpeed, paddleBounce, predictY, reflectInto, moveToward, PADDLE_H } from '../src/games/pong/logic';
import { constant, seeded } from './helpers';

describe('2048 slideLine', () => {
  it.each([
    [[2, 2, 0, 0], [4, 0, 0, 0], 4],
    [[2, 2, 2, 2], [4, 4, 0, 0], 8],
    [[2, 2, 2, 0], [4, 2, 0, 0], 4],
    [[4, 0, 4, 8], [8, 8, 0, 0], 8],
    [[2, 4, 8, 16], [2, 4, 8, 16], 0],
    [[0, 0, 0, 2], [2, 0, 0, 0], 0],
    [[8, 8, 16, 0], [16, 16, 0, 0], 16],
  ])('%j -> %j', (input, expected, gained) => {
    const r = slideLine(input);
    expect(r.line).toEqual(expected);
    expect(r.gained).toBe(gained);
  });

  it('a merged tile cannot merge again in the same move', () => {
    expect(slideLine([4, 4, 8, 0]).line).toEqual([8, 8, 0, 0]);
  });
});

describe('2048 move', () => {
  const g = () => [
    [2, 0, 2, 0],
    [0, 0, 0, 0],
    [4, 0, 0, 4],
    [0, 8, 0, 8],
  ];

  it('moves left', () => {
    const r = move(g(), 'left');
    expect(r.grid[0]).toEqual([4, 0, 0, 0]);
    expect(r.grid[2]).toEqual([8, 0, 0, 0]);
    expect(r.grid[3]).toEqual([16, 0, 0, 0]);
    expect(r.gained).toBe(28);
    expect(r.moved).toBe(true);
  });

  it('moves right', () => {
    expect(move(g(), 'right').grid[0]).toEqual([0, 0, 0, 4]);
  });

  it('moves up and down along columns', () => {
    const up = move(g(), 'up').grid;
    expect(up.map((row) => row[0])).toEqual([2, 4, 0, 0]);
    const down = move(g(), 'down').grid;
    expect(down.map((row) => row[3])).toEqual([0, 0, 4, 8]);
    expect(down.map((row) => row[0])).toEqual([0, 0, 2, 4]);
  });

  it('reports no movement when nothing can slide', () => {
    const grid = [
      [2, 4],
      [8, 16],
    ];
    expect(move(grid, 'left').moved).toBe(false);
    expect(canMove(grid)).toBe(false);
  });

  it('records tile moves for animation', () => {
    const r = move([[0, 2], [0, 0]], 'left');
    expect(r.moves).toEqual([{ fromR: 0, fromC: 1, toR: 0, toC: 0, value: 2, merged: false }]);
  });

  it('spawns into empty cells only', () => {
    const grid = createGrid(2);
    grid[0][0] = 2;
    grid[0][1] = 2;
    grid[1][0] = 2;
    const t = spawnTile(grid, constant(0.99));
    expect(t).toEqual({ r: 1, c: 1, value: 2 });
    expect(spawnTile(grid, constant(0))).toBeNull();
    expect(maxTile(grid)).toBe(2);
  });

  it('can still move when neighbours match', () => {
    expect(canMove([[2, 2], [4, 8]])).toBe(true);
  });

  it('board sizes fit the layout', () => {
    expect(tileLayout(4).size).toBe(264);
    expect(tileLayout(3).size).toBe(272);
  });
});

describe('memory', () => {
  it('deals every icon exactly twice', () => {
    const s = createState(8, seeded(3));
    const counts = new Map<number, number>();
    s.cards.forEach((c) => counts.set(c.icon, (counts.get(c.icon) ?? 0) + 1));
    expect([...counts.values()].every((n) => n === 2)).toBe(true);
    expect(counts.size).toBe(8);
  });

  it('matches pairs and counts moves', () => {
    const s = createState(2, constant(0));
    const [a, b] = [0, 1, 2, 3].filter((i) => s.cards[i].icon === s.cards[0].icon);
    expect(flip(s, a)).toBe('first');
    expect(flip(s, a)).toBe('none');
    expect(flip(s, b)).toBe('match');
    expect(s.moves).toBe(1);
    expect(s.pairsFound).toBe(1);
  });

  it('blocks a third flip until a mismatch is hidden', () => {
    const s = createState(2, constant(0));
    const first = 0;
    const other = s.cards.findIndex((c) => c.icon !== s.cards[0].icon);
    const third = s.cards.findIndex((_, i) => i !== first && i !== other);
    flip(s, first);
    expect(flip(s, other)).toBe('mismatch');
    expect(flip(s, third)).toBe('none');
    hideMismatch(s);
    expect(s.cards[first].open).toBe(false);
    expect(flip(s, third)).toBe('first');
  });

  it('completes when every pair is found', () => {
    const s = createState(2, seeded(9));
    for (let icon = 0; icon < 2; icon++) {
      s.cards.forEach((c, i) => c.icon === icon && flip(s, i));
    }
    expect(isComplete(s)).toBe(true);
  });

  it('flip animation settles on its target instead of oscillating', () => {
    let p = 0;
    const seen: number[] = [];
    for (let i = 0; i < 20; i++) {
      p = approach(p, 1, 0.111);
      seen.push(p);
    }
    expect(seen.slice(-10).every((v) => v === 1)).toBe(true);
    expect(approach(1, 1, 0.111)).toBe(1);
    expect(approach(0, 0, 0.111)).toBe(0);
    expect(approach(0.95, 0, 0.111)).toBeCloseTo(0.839);
  });

  it('computes board size', () => {
    expect(boardSize(4, 3)).toEqual({ width: 232, height: 24 + 3 * 60 + 4 * 8 });
  });
});

describe('tic-tac-toe', () => {
  const b = (s: string): Cell[] => [...s].map((c) => (c === 'X' || c === 'O' ? c : null));

  it('detects winners and draws', () => {
    expect(winner(b('XXX......'))?.mark).toBe('X');
    expect(winner(b('O...O...O'))?.line).toEqual([0, 4, 8]);
    expect(isDraw(b('XOXXOOOXX'))).toBe(true);
    expect(winner(createBoard())).toBeNull();
  });

  it('takes an immediate win', () => {
    expect(bestMove(b('OO.XX....'), 'O')).toBe(2);
  });

  it('blocks the opponent', () => {
    expect(bestMove(b('XX..O....'), 'O')).toBe(2);
  });

  it('perfect play from an empty board is a draw', () => {
    expect(minimax(createBoard(), 'X', 'X')).toBe(0);
  });

  it('perfect CPU never loses against random play', () => {
    const random = seeded(11);
    for (let game = 0; game < 30; game++) {
      const board = createBoard();
      let turn: 'X' | 'O' = game % 2 === 0 ? 'X' : 'O';
      while (!winner(board) && !isDraw(board)) {
        const i = turn === 'O' ? chooseMove(board, 'O', 1, random) : chooseMove(board, 'X', 0, random);
        board[i] = turn;
        turn = turn === 'X' ? 'O' : 'X';
      }
      expect(winner(board)?.mark).not.toBe('X');
    }
  });

  it('scores the series', () => {
    expect(seriesScore(2, 1)).toBe(240);
  });
});

describe('pong', () => {
  it('bounces horizontally from the paddle centre', () => {
    const v = paddleBounce(0, 200, 1);
    expect(v.vx).toBeCloseTo(200);
    expect(v.vy).toBeCloseTo(0);
    const edge = paddleBounce(-3, 200, -1);
    expect(edge.vx).toBeLessThan(0);
    expect(Math.atan2(-edge.vy, -edge.vx)).toBeCloseTo(MAX_ANGLE);
  });

  it('speeds up but never beyond double', () => {
    expect(nextSpeed(200, 200)).toBeCloseTo(210);
    expect(nextSpeed(399, 200)).toBe(400);
  });

  it('reflects predicted positions off the walls', () => {
    expect(reflectInto(110, 0, 100)).toBe(90);
    expect(reflectInto(-20, 0, 100)).toBe(20);
    expect(predictY(100, 50, 100, 0, 200)).toBe(50);
    expect(predictY(100, 50, -100, 0, 200)).toBe(HEIGHT / 2);
  });

  it('moves the CPU paddle at limited speed and keeps it on screen', () => {
    expect(moveToward(120, 200, 60, 0.5)).toBe(150);
    expect(moveToward(120, 1000, 10000, 1)).toBe(HEIGHT - PADDLE_H / 2);
  });
});
