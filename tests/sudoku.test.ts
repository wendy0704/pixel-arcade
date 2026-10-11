import { describe, expect, it } from 'vitest';
import {
  boxOf,
  candidates,
  clearNoteFromPeers,
  CONFIG,
  countGivens,
  countSolutions,
  digitCounts,
  findConflicts,
  formatTime,
  generatePuzzle,
  generateSolution,
  isSolved,
  maskToDigits,
  peers,
  solve,
  toggleNote,
} from '../src/games/sudoku/logic';
import { MINI_DIGITS } from '../src/games/sudoku/sprites';
import { seeded } from './helpers';

const parse = (s: string) => [...s].map((ch) => (ch === '.' ? 0 : Number(ch)));

const CLASSIC = parse(
  '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79',
);

describe('sudoku', () => {
  it('every cell has 20 peers', () => {
    for (let i = 0; i < 81; i++) expect(peers(i)).toHaveLength(20);
    expect(boxOf(0)).toBe(0);
    expect(boxOf(80)).toBe(8);
    expect(boxOf(40)).toBe(4);
  });

  it('lists candidates for a cell', () => {
    expect(maskToDigits(candidates(CLASSIC, 2))).toEqual([1, 2, 4]);
  });

  it('solves a classic puzzle uniquely', () => {
    expect(countSolutions(CLASSIC)).toBe(1);
    const solved = solve(CLASSIC)!;
    expect(isSolved(solved)).toBe(true);
    CLASSIC.forEach((v, i) => v && expect(solved[i]).toBe(v));
  });

  it('detects multiple solutions and unsolvable grids', () => {
    const empty = new Array(81).fill(0);
    expect(countSolutions(empty, 2)).toBe(2);
    const broken = CLASSIC.slice();
    broken[2] = 5;
    expect(countSolutions(broken)).toBe(0);
    expect(solve(broken)).toBeNull();
  });

  it('generates valid complete solutions', () => {
    const r = seeded(3);
    for (let k = 0; k < 5; k++) expect(isSolved(generateSolution(r))).toBe(true);
  });

  it.each(['easy', 'normal', 'hard'] as const)('generates a unique %s puzzle near the target givens', (d) => {
    const r = seeded(11);
    for (let k = 0; k < 4; k++) {
      const { puzzle, solution } = generatePuzzle(CONFIG[d].givens, r);
      expect(countSolutions(puzzle)).toBe(1);
      expect(isSolved(solution)).toBe(true);
      puzzle.forEach((v, i) => v && expect(solution[i]).toBe(v));
      expect(countGivens(puzzle)).toBeGreaterThanOrEqual(CONFIG[d].givens);
      expect(countGivens(puzzle)).toBeLessThanOrEqual(CONFIG[d].givens + 3);
    }
  });

  it('keeps puzzles symmetric', () => {
    const { puzzle } = generatePuzzle(32, seeded(5));
    for (let i = 0; i < 81; i++) expect(puzzle[i] > 0).toBe(puzzle[80 - i] > 0);
  });

  it('marks conflicting cells in rows, columns and boxes', () => {
    const grid = CLASSIC.slice();
    grid[2] = 5;
    const c = findConflicts(grid);
    expect(c[0]).toBe(true);
    expect(c[2]).toBe(true);
    expect(c[1]).toBe(false);
    expect(findConflicts(CLASSIC).some(Boolean)).toBe(false);
  });

  it('is not solved while cells are empty', () => {
    expect(isSolved(CLASSIC)).toBe(false);
  });

  it('toggles notes and clears them from peers', () => {
    const notes = new Array(81).fill(0);
    toggleNote(notes, 1, 4);
    toggleNote(notes, 9, 4);
    toggleNote(notes, 80, 4);
    expect(maskToDigits(notes[1])).toEqual([4]);
    clearNoteFromPeers(notes, 0, 4);
    expect(notes[1]).toBe(0);
    expect(notes[9]).toBe(0);
    expect(maskToDigits(notes[80])).toEqual([4]);
    toggleNote(notes, 80, 4);
    expect(notes[80]).toBe(0);
  });

  it('counts placed digits', () => {
    const counts = digitCounts(CLASSIC);
    expect(counts[0]).toBe(51);
    expect(counts.slice(1).reduce((a, b) => a + b, 0)).toBe(30);
  });

  it('formats time as mm:ss', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(65.9)).toBe('01:05');
    expect(formatTime(3600)).toBe('60:00');
  });

  it('mini digits are 3x5', () => {
    for (let d = 1; d <= 9; d++) {
      expect(MINI_DIGITS[d]).toHaveLength(5);
      MINI_DIGITS[d].forEach((row) => expect(row).toHaveLength(3));
    }
  });
});
