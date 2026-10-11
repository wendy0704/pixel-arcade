import type { Difficulty } from '../../types/game';

export interface MineCell {
  mine: boolean;
  adjacent: number;
  open: boolean;
  flag: boolean;
}

export type BoardState = 'ready' | 'playing' | 'won' | 'lost';

export interface MineBoard {
  cols: number;
  rows: number;
  mines: number;
  cells: MineCell[];
  generated: boolean;
  state: BoardState;
  opened: number;
  exploded: number;
}

export const CONFIG: Record<Difficulty, { cols: number; rows: number; mines: number }> = {
  easy: { cols: 9, rows: 9, mines: 10 },
  normal: { cols: 16, rows: 16, mines: 40 },
  hard: { cols: 30, rows: 16, mines: 99 },
};

export const CELL = 16;
export const HUD = 20;

export function createBoard(cols: number, rows: number, mines: number): MineBoard {
  return {
    cols,
    rows,
    mines,
    cells: Array.from({ length: cols * rows }, () => ({ mine: false, adjacent: 0, open: false, flag: false })),
    generated: false,
    state: 'ready',
    opened: 0,
    exploded: -1,
  };
}

export function indexOf(board: MineBoard, x: number, y: number): number {
  return y * board.cols + x;
}

export function inBounds(board: MineBoard, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < board.cols && y < board.rows;
}

export function neighbors(board: MineBoard, index: number): number[] {
  const x = index % board.cols;
  const y = Math.floor(index / board.cols);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && inBounds(board, x + dx, y + dy)) out.push(indexOf(board, x + dx, y + dy));
    }
  }
  return out;
}

export function generate(board: MineBoard, safeX: number, safeY: number, random: () => number): void {
  const safeIndex = indexOf(board, safeX, safeY);
  const safe = new Set([safeIndex, ...neighbors(board, safeIndex)]);
  const candidates: number[] = [];
  for (let i = 0; i < board.cells.length; i++) if (!safe.has(i)) candidates.push(i);
  const count = Math.min(board.mines, candidates.length);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(random() * (candidates.length - i));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    board.cells[candidates[i]].mine = true;
  }
  board.mines = count;
  board.cells.forEach((cell, i) => {
    cell.adjacent = neighbors(board, i).filter((n) => board.cells[n].mine).length;
  });
  board.generated = true;
  board.state = 'playing';
}

const finished = (board: MineBoard) => board.state === 'won' || board.state === 'lost';

export function reveal(board: MineBoard, x: number, y: number, random: () => number): number[] {
  if (finished(board) || !inBounds(board, x, y)) return [];
  if (!board.generated) generate(board, x, y, random);
  const start = indexOf(board, x, y);
  const first = board.cells[start];
  if (first.open || first.flag) return [];
  if (first.mine) {
    first.open = true;
    board.state = 'lost';
    board.exploded = start;
    return [start];
  }
  const opened: number[] = [];
  const queue = [start];
  while (queue.length) {
    const i = queue.shift() as number;
    const cell = board.cells[i];
    if (cell.open || cell.flag || cell.mine) continue;
    cell.open = true;
    board.opened++;
    opened.push(i);
    if (cell.adjacent === 0) {
      for (const n of neighbors(board, i)) if (!board.cells[n].open) queue.push(n);
    }
  }
  if (board.opened === board.cells.length - board.mines) board.state = 'won';
  return opened;
}

export function toggleFlag(board: MineBoard, x: number, y: number): boolean {
  if (finished(board) || !inBounds(board, x, y)) return false;
  const cell = board.cells[indexOf(board, x, y)];
  if (cell.open) return false;
  cell.flag = !cell.flag;
  return true;
}

export function chord(board: MineBoard, x: number, y: number, random: () => number): number[] {
  if (finished(board) || !inBounds(board, x, y)) return [];
  const i = indexOf(board, x, y);
  const cell = board.cells[i];
  if (!cell.open || cell.adjacent === 0) return [];
  const around = neighbors(board, i);
  const flags = around.filter((n) => board.cells[n].flag).length;
  if (flags !== cell.adjacent) return [];
  const opened: number[] = [];
  for (const n of around) {
    const c = board.cells[n];
    if (c.open || c.flag) continue;
    opened.push(...reveal(board, n % board.cols, Math.floor(n / board.cols), random));
    if (board.state === 'lost') break;
  }
  return opened;
}

export function flagsPlaced(board: MineBoard): number {
  return board.cells.reduce((sum, c) => sum + (c.flag ? 1 : 0), 0);
}

export function roundTime(seconds: number): number {
  return Math.round(seconds * 10) / 10;
}
