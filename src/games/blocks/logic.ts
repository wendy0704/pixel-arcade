import type { Difficulty } from '../../types/game';

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Board = (PieceType | null)[][];

export interface Piece {
  type: PieceType;
  rot: number;
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

export const COLS = 10;
export const ROWS = 20;
export const TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
export const KICKS: [number, number][] = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [-2, 0],
  [2, 0],
];
export const LINE_SCORES = [0, 100, 300, 500, 800];
export const START_LEVEL: Record<Difficulty, number> = { easy: 1, normal: 5, hard: 10 };
export const LOCK_DELAY = 0.5;
export const MAX_LOCK_RESETS = 15;
export const DAS = 0.17;
export const ARR = 0.05;

const SHAPES: Record<PieceType, string[]> = {
  I: ['....', 'XXXX', '....', '....'],
  O: ['XX', 'XX'],
  T: ['.X.', 'XXX', '...'],
  S: ['.XX', 'XX.', '...'],
  Z: ['XX.', '.XX', '...'],
  J: ['X..', 'XXX', '...'],
  L: ['..X', 'XXX', '...'],
};

export function shapeSize(type: PieceType): number {
  return SHAPES[type].length;
}

const ROTATIONS: Record<PieceType, Point[][]> = Object.fromEntries(
  TYPES.map((type) => {
    const rows = SHAPES[type];
    const n = rows.length;
    const base: Point[] = [];
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch === 'X' && base.push({ x, y })));
    const rotations: Point[][] = [base];
    for (let r = 1; r < 4; r++) rotations.push(rotations[r - 1].map((p) => ({ x: n - 1 - p.y, y: p.x })));
    return [type, rotations];
  }),
) as Record<PieceType, Point[][]>;

export function cells(type: PieceType, rot: number): Point[] {
  return ROTATIONS[type][((rot % 4) + 4) % 4];
}

export function pieceCells(p: Piece): Point[] {
  return cells(p.type, p.rot).map((c) => ({ x: c.x + p.x, y: c.y + p.y }));
}

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<PieceType | null>(COLS).fill(null));
}

export function spawn(type: PieceType): Piece {
  const n = shapeSize(type);
  return { type, rot: 0, x: Math.floor((COLS - n) / 2), y: type === 'I' ? -1 : 0 };
}

export function collides(board: Board, p: Piece): boolean {
  return pieceCells(p).some((c) => c.x < 0 || c.x >= COLS || c.y >= ROWS || (c.y >= 0 && board[c.y][c.x] !== null));
}

export function tryMove(board: Board, p: Piece, dx: number, dy: number): Piece | null {
  const next = { ...p, x: p.x + dx, y: p.y + dy };
  return collides(board, next) ? null : next;
}

export function tryRotate(board: Board, p: Piece, dir: 1 | -1): Piece | null {
  if (p.type === 'O') return null;
  const rot = (p.rot + dir + 4) % 4;
  for (const [kx, ky] of KICKS) {
    const next = { ...p, rot, x: p.x + kx, y: p.y + ky };
    if (!collides(board, next)) return next;
  }
  return null;
}

export function dropDistance(board: Board, p: Piece): number {
  let d = 0;
  while (!collides(board, { ...p, y: p.y + d + 1 })) d++;
  return d;
}

export function lock(board: Board, p: Piece): { board: Board; toppedOut: boolean } {
  const next = board.map((row) => [...row]);
  let toppedOut = false;
  for (const c of pieceCells(p)) {
    if (c.y < 0) toppedOut = true;
    else next[c.y][c.x] = p.type;
  }
  return { board: next, toppedOut };
}

export function fullRows(board: Board): number[] {
  return board.map((row, y) => (row.every((c) => c !== null) ? y : -1)).filter((y) => y >= 0);
}

export function clearLines(board: Board): { board: Board; cleared: number } {
  const kept = board.filter((row) => row.some((c) => c === null));
  const cleared = ROWS - kept.length;
  const empty = Array.from({ length: cleared }, () => Array<PieceType | null>(COLS).fill(null));
  return { board: [...empty, ...kept], cleared };
}

export function scoreForLines(lines: number, level: number): number {
  return (LINE_SCORES[lines] ?? 0) * level;
}

export function levelFor(startLevel: number, lines: number): number {
  return startLevel + Math.floor(lines / 10);
}

export function gravityInterval(level: number): number {
  return Math.max(0.05, 0.8 - (level - 1) * 0.07);
}

export function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createBag(random: () => number): () => PieceType {
  let bag: PieceType[] = [];
  return () => {
    if (bag.length === 0) bag = shuffle(TYPES, random);
    return bag.pop() as PieceType;
  };
}
