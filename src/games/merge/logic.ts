import type { Difficulty } from '../../types/game';

export type Grid = number[][];
export type Dir = 'up' | 'down' | 'left' | 'right';

export interface TileMove {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  value: number;
  merged: boolean;
}

export interface MoveResult {
  grid: Grid;
  gained: number;
  moved: boolean;
  moves: TileMove[];
}

export const SIZE: Record<Difficulty, number> = { easy: 5, normal: 4, hard: 3 };
export const TARGET = 2048;
export const FOUR_CHANCE = 0.1;
export const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

export function createGrid(n: number): Grid {
  return Array.from({ length: n }, () => Array<number>(n).fill(0));
}

export function slideLine(line: number[]): { line: number[]; gained: number; moves: { from: number; to: number; merged: boolean }[] } {
  const out: number[] = [];
  const moves: { from: number; to: number; merged: boolean }[] = [];
  let gained = 0;
  let canMerge = false;
  line.forEach((v, i) => {
    if (!v) return;
    const last = out.length - 1;
    if (canMerge && out[last] === v) {
      out[last] = v * 2;
      gained += v * 2;
      moves.push({ from: i, to: last, merged: true });
      canMerge = false;
    } else {
      out.push(v);
      moves.push({ from: i, to: out.length - 1, merged: false });
      canMerge = true;
    }
  });
  while (out.length < line.length) out.push(0);
  return { line: out, gained, moves };
}

function lineCoords(n: number, dir: Dir, k: number): [number, number][] {
  return Array.from({ length: n }, (_, i): [number, number] => {
    switch (dir) {
      case 'left':
        return [k, i];
      case 'right':
        return [k, n - 1 - i];
      case 'up':
        return [i, k];
      case 'down':
        return [n - 1 - i, k];
    }
  });
}

export function move(grid: Grid, dir: Dir): MoveResult {
  const n = grid.length;
  const next = createGrid(n);
  const moves: TileMove[] = [];
  let gained = 0;
  let moved = false;
  for (let k = 0; k < n; k++) {
    const coords = lineCoords(n, dir, k);
    const result = slideLine(coords.map(([r, c]) => grid[r][c]));
    result.line.forEach((v, i) => {
      const [r, c] = coords[i];
      next[r][c] = v;
    });
    gained += result.gained;
    for (const m of result.moves) {
      const [fromR, fromC] = coords[m.from];
      const [toR, toC] = coords[m.to];
      if (m.from !== m.to || m.merged) moved = true;
      moves.push({ fromR, fromC, toR, toC, value: grid[fromR][fromC], merged: m.merged });
    }
  }
  return { grid: next, gained, moved, moves };
}

export function emptyCells(grid: Grid): [number, number][] {
  const out: [number, number][] = [];
  grid.forEach((row, r) => row.forEach((v, c) => !v && out.push([r, c])));
  return out;
}

export function spawnTile(grid: Grid, random: () => number, fourChance = FOUR_CHANCE): { r: number; c: number; value: number } | null {
  const empty = emptyCells(grid);
  if (!empty.length) return null;
  const [r, c] = empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))];
  const value = random() < fourChance ? 4 : 2;
  grid[r][c] = value;
  return { r, c, value };
}

export function canMove(grid: Grid): boolean {
  const n = grid.length;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      if (!v) return true;
      if (c + 1 < n && grid[r][c + 1] === v) return true;
      if (r + 1 < n && grid[r + 1][c] === v) return true;
    }
  }
  return false;
}

export function maxTile(grid: Grid): number {
  return Math.max(...grid.flat());
}

export function tileLayout(n: number): { tile: number; gap: number; size: number } {
  const tile = n >= 5 ? 44 : n === 4 ? 56 : 80;
  const gap = 8;
  return { tile, gap, size: n * tile + (n + 1) * gap };
}
