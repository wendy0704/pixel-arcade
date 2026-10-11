import type { Difficulty } from '../../types/game';

export const SIZE = 9;
export const CELLS = 81;
export const ALL = 0x3fe;

export const CONFIG: Record<Difficulty, { givens: number }> = {
  easy: { givens: 40 },
  normal: { givens: 32 },
  hard: { givens: 26 },
};

export type Grid = number[];

export interface Puzzle {
  puzzle: Grid;
  solution: Grid;
}

export const rowOf = (i: number) => Math.floor(i / SIZE);
export const colOf = (i: number) => i % SIZE;
export const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

const PEERS: number[][] = Array.from({ length: CELLS }, (_, i) => {
  const out: number[] = [];
  for (let j = 0; j < CELLS; j++) {
    if (j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i))) out.push(j);
  }
  return out;
});

export function peers(i: number): readonly number[] {
  return PEERS[i];
}

export function candidates(grid: Grid, i: number): number {
  let used = 0;
  for (const p of PEERS[i]) if (grid[p]) used |= 1 << grid[p];
  return ALL & ~used;
}

export function maskToDigits(mask: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) if (mask & (1 << d)) out.push(d);
  return out;
}

function bitCount(mask: number): number {
  let n = 0;
  for (let m = mask; m; m &= m - 1) n++;
  return n;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function search(grid: Grid, limit: number, random: (() => number) | null): number {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let i = 0; i < CELLS; i++) {
    if (grid[i]) continue;
    const mask = candidates(grid, i);
    const n = bitCount(mask);
    if (n === 0) return 0;
    if (n < bestCount) {
      best = i;
      bestMask = mask;
      bestCount = n;
      if (n === 1) break;
    }
  }
  if (best < 0) return 1;
  const digits = maskToDigits(bestMask);
  if (random) shuffle(digits, random);
  let found = 0;
  for (const d of digits) {
    grid[best] = d;
    found += search(grid, limit - found, random);
    if (found >= limit) {
      if (random) return found;
      break;
    }
  }
  grid[best] = 0;
  return found;
}

export function countSolutions(grid: Grid, limit = 2): number {
  return search(grid.slice(), limit, null);
}

export function solve(grid: Grid): Grid | null {
  const work = grid.slice();
  return search(work, 1, () => 0) ? work : null;
}

export function generateSolution(random: () => number): Grid {
  const grid: Grid = new Array(CELLS).fill(0);
  search(grid, 1, random);
  return grid;
}

function carve(givens: number, random: () => number): Puzzle {
  const solution = generateSolution(random);
  const puzzle = solution.slice();
  let filled = CELLS;
  const order = shuffle(
    Array.from({ length: 41 }, (_, i) => i),
    random,
  );
  for (const i of order) {
    if (filled <= givens) break;
    const mirror = CELLS - 1 - i;
    const pair = i === mirror ? [i] : [i, mirror];
    if (filled - pair.length < givens) continue;
    const saved = pair.map((k) => puzzle[k]);
    pair.forEach((k) => (puzzle[k] = 0));
    if (countSolutions(puzzle, 2) === 1) filled -= pair.length;
    else pair.forEach((k, n) => (puzzle[k] = saved[n]));
  }
  return { puzzle, solution };
}

export function countGivens(grid: Grid): number {
  return grid.filter((v) => v > 0).length;
}

export function generatePuzzle(givens: number, random: () => number, attempts = 6): Puzzle {
  let best = carve(givens, random);
  for (let k = 1; k < attempts && countGivens(best.puzzle) > givens; k++) {
    const next = carve(givens, random);
    if (countGivens(next.puzzle) < countGivens(best.puzzle)) best = next;
  }
  return best;
}

export function findConflicts(grid: Grid): boolean[] {
  const out = new Array<boolean>(CELLS).fill(false);
  for (let i = 0; i < CELLS; i++) {
    if (!grid[i]) continue;
    for (const p of PEERS[i]) {
      if (grid[p] === grid[i]) {
        out[i] = true;
        break;
      }
    }
  }
  return out;
}

export function isSolved(grid: Grid): boolean {
  return grid.every((v) => v > 0) && !findConflicts(grid).some(Boolean);
}

export function digitCounts(grid: Grid): number[] {
  const counts = new Array<number>(10).fill(0);
  for (const v of grid) counts[v]++;
  return counts;
}

export function toggleNote(notes: number[], i: number, digit: number): void {
  notes[i] ^= 1 << digit;
}

export function clearNoteFromPeers(notes: number[], i: number, digit: number): void {
  for (const p of PEERS[i]) notes[p] &= ~(1 << digit);
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
