import type { Difficulty } from '../../types/game';

export const SIZE = 8;
export const HAND = 3;
export const CLEAR_BONUS = 300;
export const COMBO_GRACE = 3;
const DEAL_ATTEMPTS = 40;
const SEARCH_BUDGET = 30000;

export type Board = number[];

export interface Shape {
  cells: [number, number][];
  w: number;
  h: number;
  weight: number;
}

export interface Piece {
  shape: number;
  color: number;
}

const shape = (pattern: string, weight: number): Shape => {
  const rows = pattern.split('/');
  const cells: [number, number][] = [];
  rows.forEach((row, r) => [...row].forEach((ch, c) => ch === '#' && cells.push([c, r])));
  return { cells, w: Math.max(...rows.map((r) => r.length)), h: rows.length, weight };
};

export const SHAPES: Shape[] = [
  shape('#', 2),
  shape('##', 1.5),
  shape('#/#', 1.5),
  shape('###', 1.5),
  shape('#/#/#', 1.5),
  shape('####', 1),
  shape('#/#/#/#', 1),
  shape('#####', 0.6),
  shape('#/#/#/#/#', 0.6),
  shape('##/##', 2),
  shape('###/###/###', 0.6),
  shape('###/###', 0.8),
  shape('##/##/##', 0.8),
  shape('##/#.', 0.6),
  shape('##/.#', 0.6),
  shape('#./##', 0.6),
  shape('.#/##', 0.6),
  shape('#./#./##', 0.35),
  shape('.#/.#/##', 0.35),
  shape('##/#./#.', 0.35),
  shape('##/.#/.#', 0.35),
  shape('###/#..', 0.35),
  shape('###/..#', 0.35),
  shape('#../###', 0.35),
  shape('..#/###', 0.35),
  shape('###/.#.', 0.4),
  shape('.#./###', 0.4),
  shape('#./##/#.', 0.4),
  shape('.#/##/.#', 0.4),
  shape('.##/##.', 0.35),
  shape('##./.##', 0.35),
  shape('#./##/.#', 0.35),
  shape('.#/##/#.', 0.35),
  shape('###/#../#..', 0.3),
  shape('###/..#/..#', 0.3),
  shape('#../#../###', 0.3),
  shape('..#/..#/###', 0.3),
];

export type Guarantee = 'all' | 'one' | 'none';

export interface DealConfig {
  small: number;
  large: number;
  guarantee: Guarantee;
}

export const CONFIG: Record<Difficulty, DealConfig> = {
  easy: { small: 1.6, large: 0.6, guarantee: 'all' },
  normal: { small: 1, large: 1, guarantee: 'one' },
  hard: { small: 0.7, large: 1.5, guarantee: 'none' },
};

export const COLOR_COUNT = 8;

export const createBoard = (): Board => new Array<number>(SIZE * SIZE).fill(0);

export function canPlace(board: Board, s: Shape, col: number, row: number): boolean {
  if (col < 0 || row < 0 || col + s.w > SIZE || row + s.h > SIZE) return false;
  return s.cells.every(([c, r]) => board[(row + r) * SIZE + col + c] === 0);
}

export function fits(board: Board, s: Shape): boolean {
  for (let row = 0; row <= SIZE - s.h; row++) {
    for (let col = 0; col <= SIZE - s.w; col++) if (canPlace(board, s, col, row)) return true;
  }
  return false;
}

export interface Lines {
  rows: number[];
  cols: number[];
}

export function fullLines(board: Board): Lines {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let i = 0; i < SIZE; i++) {
    let row = true;
    let col = true;
    for (let k = 0; k < SIZE; k++) {
      if (!board[i * SIZE + k]) row = false;
      if (!board[k * SIZE + i]) col = false;
    }
    if (row) rows.push(i);
    if (col) cols.push(i);
  }
  return { rows, cols };
}

export function lineCells(lines: Lines): number[] {
  const set = new Set<number>();
  for (const r of lines.rows) for (let c = 0; c < SIZE; c++) set.add(r * SIZE + c);
  for (const c of lines.cols) for (let r = 0; r < SIZE; r++) set.add(r * SIZE + c);
  return [...set];
}

export function previewLines(board: Board, s: Shape, col: number, row: number): Lines {
  const copy = board.slice();
  for (const [c, r] of s.cells) copy[(row + r) * SIZE + col + c] = 1;
  return fullLines(copy);
}

export interface PlaceResult {
  lines: number;
  cleared: { index: number; color: number }[];
}

export function place(board: Board, s: Shape, col: number, row: number, color: number): PlaceResult {
  for (const [c, r] of s.cells) board[(row + r) * SIZE + col + c] = color + 1;
  const lines = fullLines(board);
  const cleared = lineCells(lines).map((index) => ({ index, color: board[index] - 1 }));
  for (const { index } of cleared) board[index] = 0;
  return { lines: lines.rows.length + lines.cols.length, cleared };
}

export const lineScore = (lines: number): number => (10 * lines * (lines + 1)) / 2;

export interface ComboState {
  combo: number;
  miss: number;
}

export function scorePlacement(cells: number, lines: number, state: ComboState, boardEmpty: boolean): number {
  if (lines > 0) {
    state.combo++;
    state.miss = 0;
  } else if (++state.miss >= COMBO_GRACE) {
    state.combo = 0;
    state.miss = 0;
  }
  const bonus = lines > 0 ? lineScore(lines) * Math.max(1, state.combo) : 0;
  return cells + bonus + (lines > 0 && boardEmpty ? CLEAR_BONUS : 0);
}

export function canPlaceAll(board: Board, shapes: Shape[], budget = { left: SEARCH_BUDGET }): boolean {
  if (!shapes.length) return true;
  for (let i = 0; i < shapes.length; i++) {
    const s = shapes[i];
    const rest = shapes.filter((_, k) => k !== i);
    for (let row = 0; row <= SIZE - s.h; row++) {
      for (let col = 0; col <= SIZE - s.w; col++) {
        if (--budget.left < 0) return false;
        if (!canPlace(board, s, col, row)) continue;
        const copy = board.slice();
        place(copy, s, col, row, 0);
        if (canPlaceAll(copy, rest, budget)) return true;
      }
    }
  }
  return false;
}

function pickShape(config: DealConfig, random: () => number): number {
  const weights = SHAPES.map((s) => s.weight * (s.cells.length <= 3 ? config.small : s.cells.length >= 5 ? config.large : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll < 0) return i;
  }
  return weights.length - 1;
}

const acceptable = (board: Board, shapes: number[], guarantee: Guarantee): boolean => {
  if (guarantee === 'none') return true;
  if (guarantee === 'one') return shapes.some((i) => fits(board, SHAPES[i]));
  return canPlaceAll(
    board,
    shapes.map((i) => SHAPES[i]),
  );
};

export function deal(board: Board, config: DealConfig, random: () => number): Piece[] {
  let shapes: number[] = [];
  for (let attempt = 0; attempt < DEAL_ATTEMPTS; attempt++) {
    shapes = Array.from({ length: HAND }, () => pickShape(config, random));
    if (acceptable(board, shapes, config.guarantee)) break;
    if (attempt === DEAL_ATTEMPTS - 1) {
      if (config.guarantee === 'all') shapes = shapes.map(() => 0);
      else if (config.guarantee === 'one') shapes[0] = 0;
    }
  }
  return shapes.map((shape) => ({ shape, color: Math.floor(random() * COLOR_COUNT) }));
}

export const anyFits = (board: Board, hand: (Piece | null)[]): boolean =>
  hand.some((p) => p !== null && fits(board, SHAPES[p.shape]));
