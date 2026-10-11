import type { Difficulty } from '../../types/game';

export const WIDTH = 320;
export const HEIGHT = 360;
export const ROWS = 5;
export const COLS = 11;
export const SPACING_X = 20;
export const SPACING_Y = 16;
export const ALIEN_W = 12;
export const ALIEN_H = 8;
export const ORIGIN_X = Math.floor((WIDTH - ((COLS - 1) * SPACING_X + ALIEN_W)) / 2);
export const ORIGIN_Y = 56;
export const STEP_X = 2;
export const DROP_Y = 8;
export const EDGE = 6;
export const PLAYER_Y = 324;
export const PLAYER_W = 13;
export const PLAYER_H = 8;
export const GROUND_Y = 338;
export const SHIELD_Y = 286;
export const SHIELD_CELL = 2;
export const ROW_POINTS = [30, 20, 20, 10, 10];
export const UFO_POINTS = [50, 100, 150, 300];
export const LIVES = 3;
export const MAX_WAVE_DROP = 3;

export const CONFIG: Record<Difficulty, { interval: number; maxBullets: number; fireMin: number; fireMax: number }> = {
  easy: { interval: 0.8, maxBullets: 2, fireMin: 1.2, fireMax: 2.0 },
  normal: { interval: 0.6, maxBullets: 3, fireMin: 0.8, fireMax: 1.5 },
  hard: { interval: 0.45, maxBullets: 4, fireMin: 0.5, fireMax: 1.0 },
};

export const SHIELD_SHAPE = [
  '..XXXXXXX..',
  '.XXXXXXXXX.',
  'XXXXXXXXXXX',
  'XXXXXXXXXXX',
  'XXXXXXXXXXX',
  'XXXX...XXXX',
  'XXX.....XXX',
  'XXX.....XXX',
];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Alien {
  row: number;
  col: number;
  alive: boolean;
}

export interface Formation {
  aliens: Alien[];
  offsetX: number;
  offsetY: number;
  dir: 1 | -1;
  frame: 0 | 1;
}

export interface Shield {
  x: number;
  y: number;
  cols: number;
  rows: number;
  cells: boolean[];
}

export function createFormation(wave: number): Formation {
  const aliens: Alien[] = [];
  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) aliens.push({ row, col, alive: true });
  return { aliens, offsetX: 0, offsetY: DROP_Y * Math.min(Math.max(0, wave - 1), MAX_WAVE_DROP), dir: 1, frame: 0 };
}

export function alienRect(f: Formation, a: Alien): Rect {
  return {
    x: ORIGIN_X + a.col * SPACING_X + f.offsetX,
    y: ORIGIN_Y + a.row * SPACING_Y + f.offsetY,
    w: ALIEN_W,
    h: ALIEN_H,
  };
}

export function aliveCount(f: Formation): number {
  return f.aliens.reduce((n, a) => n + (a.alive ? 1 : 0), 0);
}

export function aliveBounds(f: Formation): { minX: number; maxX: number; maxY: number } | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const a of f.aliens) {
    if (!a.alive) continue;
    const r = alienRect(f, a);
    minX = Math.min(minX, r.x);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return Number.isFinite(minX) ? { minX, maxX, maxY } : null;
}

export function stepFormation(f: Formation): 'move' | 'drop' | 'none' {
  const b = aliveBounds(f);
  if (!b) return 'none';
  f.frame = f.frame === 0 ? 1 : 0;
  const dx = STEP_X * f.dir;
  if (b.minX + dx < EDGE || b.maxX + dx > WIDTH - EDGE) {
    f.offsetY += DROP_Y;
    f.dir = f.dir === 1 ? -1 : 1;
    return 'drop';
  }
  f.offsetX += dx;
  return 'move';
}

export function stepInterval(base: number, alive: number, total = ROWS * COLS): number {
  return Math.max(0.03, base * (0.08 + (0.92 * alive) / total));
}

export function shooters(f: Formation): Alien[] {
  const bottom = new Map<number, Alien>();
  for (const a of f.aliens) {
    if (!a.alive) continue;
    const current = bottom.get(a.col);
    if (!current || a.row > current.row) bottom.set(a.col, a);
  }
  return [...bottom.values()];
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function createShields(): Shield[] {
  const rows = SHIELD_SHAPE.length;
  const cols = SHIELD_SHAPE[0].length;
  const w = cols * SHIELD_CELL;
  const gap = WIDTH / 4;
  return [0, 1, 2, 3].map((i) => ({
    x: Math.round(gap * i + gap / 2 - w / 2),
    y: SHIELD_Y,
    cols,
    rows,
    cells: SHIELD_SHAPE.join('').split('').map((ch) => ch === 'X'),
  }));
}

function shieldCellsIn(s: Shield, r: Rect): number[] {
  const out: number[] = [];
  const x0 = Math.max(0, Math.floor((r.x - s.x) / SHIELD_CELL));
  const x1 = Math.min(s.cols - 1, Math.floor((r.x + r.w - 1 - s.x) / SHIELD_CELL));
  const y0 = Math.max(0, Math.floor((r.y - s.y) / SHIELD_CELL));
  const y1 = Math.min(s.rows - 1, Math.floor((r.y + r.h - 1 - s.y) / SHIELD_CELL));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push(y * s.cols + x);
  return out;
}

export function hitShield(s: Shield, r: Rect): boolean {
  const hit = shieldCellsIn(s, r).find((i) => s.cells[i]);
  if (hit === undefined) return false;
  const hx = hit % s.cols;
  const hy = Math.floor(hit / s.cols);
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = hx + dx;
    const y = hy + dy;
    if (x >= 0 && y >= 0 && x < s.cols && y < s.rows) s.cells[y * s.cols + x] = false;
  }
  return true;
}

export function eraseShield(s: Shield, r: Rect): void {
  for (const i of shieldCellsIn(s, r)) s.cells[i] = false;
}

export function ufoPoints(random: () => number): number {
  return UFO_POINTS[Math.min(UFO_POINTS.length - 1, Math.floor(random() * UFO_POINTS.length))];
}

export function randomBetween(min: number, max: number, random: () => number): number {
  return min + (max - min) * random();
}
