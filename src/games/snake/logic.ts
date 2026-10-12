import type { Difficulty } from '../../types/game';

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

export interface SnakeState {
  cols: number;
  rows: number;
  body: Point[];
  dir: Dir;
  queue: Dir[];
  food: Point | null;
  eaten: number;
  alive: boolean;
  won: boolean;
}

export type StepEvent = 'move' | 'eat' | 'dead' | 'win';

export const COLS = 20;
export const ROWS = 20;
export const CELL = 16;
export const MAX_QUEUE = 2;
export const POINTS_PER_FOOD = 10;
export const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

export const SPEED: Record<Difficulty, { start: number; max: number; every: number }> = {
  easy: { start: 3, max: 6, every: 8 },
  normal: { start: 5, max: 10, every: 5 },
  hard: { start: 8, max: 16, every: 3 },
};

const VEC: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

export function createSnake(cols: number, rows: number, random: () => number): SnakeState {
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const state: SnakeState = {
    cols,
    rows,
    body: [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ],
    dir: 'right',
    queue: [],
    food: null,
    eaten: 0,
    alive: true,
    won: false,
  };
  placeFood(state, random);
  return state;
}

export function placeFood(state: SnakeState, random: () => number): void {
  const occupied = new Set(state.body.map((p) => p.y * state.cols + p.x));
  const empty: Point[] = [];
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      if (!occupied.has(y * state.cols + x)) empty.push({ x, y });
    }
  }
  state.food = empty.length ? empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))] : null;
}

export function queueTurn(state: SnakeState, dir: Dir): boolean {
  if (state.queue.length >= MAX_QUEUE) return false;
  const last = state.queue.length ? state.queue[state.queue.length - 1] : state.dir;
  if (dir === last || dir === OPPOSITE[last]) return false;
  state.queue.push(dir);
  return true;
}

export function step(state: SnakeState, random: () => number): StepEvent {
  if (!state.alive) return 'dead';
  if (state.won) return 'win';
  const next = state.queue.shift();
  if (next) state.dir = next;
  const v = VEC[state.dir];
  const head = state.body[0];
  const nh = { x: head.x + v.x, y: head.y + v.y };
  if (nh.x < 0 || nh.y < 0 || nh.x >= state.cols || nh.y >= state.rows) {
    state.alive = false;
    return 'dead';
  }
  const eating = state.food !== null && same(nh, state.food);
  const blocking = eating ? state.body : state.body.slice(0, -1);
  if (blocking.some((p) => same(p, nh))) {
    state.alive = false;
    return 'dead';
  }
  state.body.unshift(nh);
  if (!eating) {
    state.body.pop();
    return 'move';
  }
  state.eaten++;
  placeFood(state, random);
  if (!state.food) {
    state.won = true;
    return 'win';
  }
  return 'eat';
}

export function speedFor(difficulty: Difficulty, eaten: number): number {
  const { start, max, every } = SPEED[difficulty];
  return Math.min(max, start + Math.floor(eaten / every));
}
