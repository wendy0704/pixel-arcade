import { describe, expect, it } from 'vitest';
import {
  chord,
  CONFIG,
  createBoard,
  flagsPlaced,
  indexOf,
  neighbors,
  reveal,
  roundTime,
  toggleFlag,
  type MineBoard,
} from '../src/games/minesweeper/logic';
import { seeded } from './helpers';

function boardFrom(layout: string[]): MineBoard {
  const rows = layout.length;
  const cols = layout[0].length;
  const b = createBoard(cols, rows, 0);
  layout.forEach((row, y) => [...row].forEach((ch, x) => (b.cells[indexOf(b, x, y)].mine = ch === '*')));
  b.mines = b.cells.filter((c) => c.mine).length;
  b.cells.forEach((c, i) => (c.adjacent = neighbors(b, i).filter((n) => b.cells[n].mine).length));
  b.generated = true;
  b.state = 'playing';
  return b;
}

describe('minesweeper generation', () => {
  it.each(['easy', 'normal', 'hard'] as const)('first click is always safe (%s)', (d) => {
    const { cols, rows, mines } = CONFIG[d];
    for (let seed = 1; seed <= 30; seed++) {
      const b = createBoard(cols, rows, mines);
      const x = seed % cols;
      const y = (seed * 7) % rows;
      reveal(b, x, y, seeded(seed));
      const i = indexOf(b, x, y);
      expect(b.cells[i].mine).toBe(false);
      for (const n of neighbors(b, i)) expect(b.cells[n].mine).toBe(false);
      expect(b.cells.filter((c) => c.mine)).toHaveLength(mines);
      expect(b.state).not.toBe('lost');
    }
  });

  it('computes adjacent counts', () => {
    const b = boardFrom(['*..', '...', '..*']);
    expect(b.cells[indexOf(b, 1, 1)].adjacent).toBe(2);
    expect(b.cells[indexOf(b, 1, 0)].adjacent).toBe(1);
    expect(b.cells[indexOf(b, 2, 0)].adjacent).toBe(0);
  });
});

describe('minesweeper reveal', () => {
  it('flood fills connected empty cells and stops at numbers', () => {
    const b = boardFrom(['....', '....', '...*', '....']);
    const opened = reveal(b, 0, 0, seeded());
    expect(opened.length).toBe(b.cells.length - 2);
    expect(b.cells[indexOf(b, 3, 3)].open).toBe(false);
    expect(b.cells[indexOf(b, 2, 2)].open).toBe(true);
  });

  it('does not open flagged cells during flood fill', () => {
    const b = boardFrom(['....', '....', '...*', '....']);
    toggleFlag(b, 0, 3);
    reveal(b, 0, 0, seeded());
    expect(b.cells[indexOf(b, 0, 3)].open).toBe(false);
  });

  it('loses when opening a mine', () => {
    const b = boardFrom(['*.', '..']);
    reveal(b, 0, 0, seeded());
    expect(b.state).toBe('lost');
    expect(b.exploded).toBe(0);
  });

  it('wins when every safe cell is open', () => {
    const b = boardFrom(['*.', '..']);
    reveal(b, 1, 0, seeded());
    reveal(b, 0, 1, seeded());
    expect(b.state).toBe('playing');
    reveal(b, 1, 1, seeded());
    expect(b.state).toBe('won');
  });

  it('ignores actions after the game ends', () => {
    const b = boardFrom(['*.', '..']);
    reveal(b, 0, 0, seeded());
    expect(reveal(b, 1, 1, seeded())).toEqual([]);
    expect(toggleFlag(b, 1, 1)).toBe(false);
  });
});

describe('minesweeper flags and chord', () => {
  it('toggles flags on closed cells only', () => {
    const b = boardFrom(['*..', '...', '...']);
    expect(toggleFlag(b, 0, 0)).toBe(true);
    expect(flagsPlaced(b)).toBe(1);
    expect(toggleFlag(b, 0, 0)).toBe(true);
    expect(flagsPlaced(b)).toBe(0);
    reveal(b, 1, 1, seeded());
    expect(toggleFlag(b, 1, 1)).toBe(false);
  });

  it('chord opens neighbours when flags match the number', () => {
    const b = boardFrom(['*..', '...', '...']);
    reveal(b, 1, 1, seeded());
    toggleFlag(b, 0, 0);
    chord(b, 1, 1, seeded());
    expect(b.state).toBe('won');
  });

  it('chord does nothing when flags do not match', () => {
    const b = boardFrom(['*..', '...', '...']);
    reveal(b, 1, 1, seeded());
    expect(chord(b, 1, 1, seeded())).toEqual([]);
    expect(b.cells[indexOf(b, 2, 2)].open).toBe(false);
  });

  it('chord with a wrong flag can lose', () => {
    const b = boardFrom(['*..', '...', '...']);
    reveal(b, 1, 1, seeded());
    toggleFlag(b, 2, 2);
    chord(b, 1, 1, seeded());
    expect(b.state).toBe('lost');
  });

  it('rounds time to one decimal', () => {
    expect(roundTime(12.345)).toBe(12.3);
    expect(roundTime(9.96)).toBe(10);
  });
});
