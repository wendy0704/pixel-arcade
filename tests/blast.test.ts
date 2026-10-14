import { describe, expect, it, vi } from 'vitest';
import { BOARD_X, BOARD_Y, CELL, createGame, dragTarget, HEIGHT, slotCenter, WIDTH } from '../src/games/blast/game';
import * as bl from '../src/games/blast/logic';
import { seeded } from './helpers';

const find = (pattern: string) => {
  const rows = pattern.split('/');
  return bl.SHAPES.findIndex(
    (s) => s.h === rows.length && s.w === rows[0].length && s.cells.every(([c, r]) => rows[r][c] === '#') && s.cells.length === pattern.split('#').length - 1,
  );
};

const fillRow = (board: bl.Board, row: number, except: number[] = []) => {
  for (let c = 0; c < bl.SIZE; c++) if (!except.includes(c)) board[row * bl.SIZE + c] = 1;
};

describe('blast shapes', () => {
  it('builds every shape with a correct bounding box and no duplicates', () => {
    const keys = new Set<string>();
    for (const s of bl.SHAPES) {
      expect(Math.max(...s.cells.map(([c]) => c)) + 1).toBe(s.w);
      expect(Math.max(...s.cells.map(([, r]) => r)) + 1).toBe(s.h);
      keys.add(JSON.stringify(s.cells));
    }
    expect(keys.size).toBe(bl.SHAPES.length);
    expect(find('##/##')).toBeGreaterThanOrEqual(0);
  });
});

describe('blast placement', () => {
  it('only places pieces inside the board on empty cells', () => {
    const board = bl.createBoard();
    const square = bl.SHAPES[find('##/##')];
    expect(bl.canPlace(board, square, 6, 6)).toBe(true);
    expect(bl.canPlace(board, square, 7, 0)).toBe(false);
    expect(bl.canPlace(board, square, -1, 0)).toBe(false);
    board[0] = 1;
    expect(bl.canPlace(board, square, 0, 0)).toBe(false);
  });

  it('clears full rows and columns at the same time, counting the shared cell once', () => {
    const board = bl.createBoard();
    fillRow(board, 3, [5]);
    for (let r = 0; r < bl.SIZE; r++) if (r !== 3) board[r * bl.SIZE + 5] = 2;
    const preview = bl.previewLines(board, bl.SHAPES[0], 5, 3);
    expect(preview).toEqual({ rows: [3], cols: [5] });
    const result = bl.place(board, bl.SHAPES[0], 5, 3, 4);
    expect(result.lines).toBe(2);
    expect(result.cleared).toHaveLength(15);
    expect(board.every((v) => v === 0)).toBe(true);
  });

  it('stores colours so cleared cells can be animated', () => {
    const board = bl.createBoard();
    fillRow(board, 0, [0]);
    const { cleared } = bl.place(board, bl.SHAPES[0], 0, 0, 6);
    expect(cleared.find((c) => c.index === 0)?.color).toBe(6);
  });

  it('knows when a shape fits anywhere', () => {
    const board = bl.createBoard().fill(1);
    board[0] = 0;
    expect(bl.fits(board, bl.SHAPES[0])).toBe(true);
    expect(bl.fits(board, bl.SHAPES[find('##')])).toBe(false);
    expect(bl.anyFits(board, [null, { shape: find('##'), color: 0 }])).toBe(false);
  });
});

describe('blast scoring', () => {
  it('gives more points for several lines at once', () => {
    expect([1, 2, 3, 4].map(bl.lineScore)).toEqual([10, 30, 60, 100]);
  });

  it('multiplies by the combo and keeps it for a few placements without clearing', () => {
    const state = { combo: 0, miss: 0 };
    expect(bl.scorePlacement(4, 1, state, false)).toBe(14);
    expect(bl.scorePlacement(3, 2, state, false)).toBe(3 + 30 * 2);
    expect(bl.scorePlacement(2, 0, state, false)).toBe(2);
    expect(bl.scorePlacement(2, 0, state, false)).toBe(2);
    expect(bl.scorePlacement(1, 1, state, false)).toBe(1 + 10 * 3);
    for (let i = 0; i < bl.COMBO_GRACE; i++) bl.scorePlacement(1, 0, state, false);
    expect(state.combo).toBe(0);
  });

  it('adds a bonus for emptying the whole board', () => {
    expect(bl.scorePlacement(1, 1, { combo: 0, miss: 0 }, true)).toBe(1 + 10 + bl.CLEAR_BONUS);
  });
});

describe('blast dealing', () => {
  it('deals three pieces with valid shapes and colours', () => {
    const hand = bl.deal(bl.createBoard(), bl.CONFIG.normal, seeded(1));
    expect(hand).toHaveLength(bl.HAND);
    hand.forEach((p) => {
      expect(bl.SHAPES[p.shape]).toBeDefined();
      expect(p.color).toBeGreaterThanOrEqual(0);
      expect(p.color).toBeLessThan(bl.COLOR_COUNT);
    });
  });

  it('on easy, always deals a hand that can be placed completely', () => {
    const random = seeded(3);
    for (let n = 0; n < 30; n++) {
      const board = bl.createBoard().map(() => (random() < 0.55 ? 1 : 0));
      bl.place(board, bl.SHAPES[0], 0, 0, 0);
      const hand = bl.deal(board, bl.CONFIG.easy, random);
      expect(bl.canPlaceAll(board, hand.map((p) => bl.SHAPES[p.shape]))).toBe(true);
    }
  });

  it('on normal, always deals at least one piece that fits', () => {
    const random = seeded(4);
    for (let n = 0; n < 30; n++) {
      const board = bl.createBoard().map(() => (random() < 0.7 ? 1 : 0));
      board[0] = 0;
      const hand = bl.deal(board, bl.CONFIG.normal, random);
      expect(bl.anyFits(board, hand)).toBe(true);
    }
  });

  it('deals more small pieces on easy than on hard', () => {
    const smallShare = (config: bl.DealConfig) => {
      const random = seeded(9);
      let small = 0;
      for (let n = 0; n < 300; n++) small += bl.deal(bl.createBoard(), config, random).filter((p) => bl.SHAPES[p.shape].cells.length <= 3).length;
      return small;
    };
    expect(smallShare(bl.CONFIG.easy)).toBeGreaterThan(smallShare(bl.CONFIG.hard));
  });
});

describe('blast game', () => {
  const setup = (seed: number) => {
    const finish = vi.fn();
    const scores: number[] = [];
    const pressed = new Set<string>();
    const game = createGame();
    game.init({
      ctx: {} as CanvasRenderingContext2D,
      width: WIDTH,
      height: HEIGHT,
      difficulty: 'normal',
      input: { isDown: () => false, wasPressed: (a) => pressed.has(a) },
      audio: { play: () => undefined },
      random: seeded(seed),
      setScore: (s) => scores.push(s),
      finish,
    });
    const hand = bl.deal(bl.createBoard(), bl.CONFIG.normal, seeded(seed));
    const press = (...actions: string[]) => {
      actions.forEach((a) => pressed.add(a));
      game.update(1 / 60);
      pressed.clear();
    };
    const drag = (slot: number, x: number, y: number, pointerType: 'mouse' | 'touch' = 'mouse') => {
      const from = slotCenter(slot);
      game.onPointer!({ type: 'down', x: from.x, y: from.y, button: 'primary', pointerType });
      game.onPointer!({ type: 'move', x, y, button: 'primary', pointerType });
      game.onPointer!({ type: 'up', x, y, button: 'primary', pointerType });
    };
    return { game, hand, scores, press, drag, finish };
  };

  const centreOf = (piece: bl.Piece, col: number, row: number) => {
    const s = bl.SHAPES[piece.shape];
    return { x: BOARD_X + (col + s.w / 2) * CELL, y: BOARD_Y + (row + s.h / 2) * CELL };
  };

  it('places a dragged piece where the mouse drops it and scores its cells', () => {
    const { hand, scores, drag } = setup(2);
    const { x, y } = centreOf(hand[0], 0, 0);
    drag(0, x, y);
    expect(scores.at(-1)).toBe(bl.SHAPES[hand[0].shape].cells.length);
  });

  it('keeps the piece when it is dropped back on the tray', () => {
    const { scores, drag } = setup(2);
    const back = slotCenter(1);
    drag(0, back.x, back.y + 20);
    expect(scores.at(-1)).toBe(0);
  });

  it('floats a touched piece above the finger', () => {
    const piece = { shape: 0, color: 0 };
    const mouse = dragTarget(piece, 100, 150, false);
    const touch = dragTarget(piece, 100, 150, true);
    expect(mouse.top - touch.top).toBeGreaterThan(CELL);
    expect(touch.left).toBe(mouse.left);
  });

  it('ends the game with GAME OVER once nothing fits', () => {
    const { drag, finish, game, scores } = setup(8);
    const random = seeded(99);
    for (let n = 0; n < 4000 && !finish.mock.calls.length; n++) {
      drag(Math.floor(random() * 3), BOARD_X + random() * 8 * CELL, BOARD_Y + random() * 8 * CELL);
      game.update(1);
    }
    expect(finish).toHaveBeenCalledWith({ score: scores.at(-1), completed: true, headline: 'GAME OVER' });
  });

  it('can be played with the keyboard', () => {
    const { hand, scores, press } = setup(5);
    press('up');
    for (let i = 0; i < 8; i++) press('left', 'up');
    press('primary');
    expect(scores.at(-1)).toBe(bl.SHAPES[hand[0].shape].cells.length);
  });
});
