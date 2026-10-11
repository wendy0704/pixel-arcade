import type { Difficulty } from '../../types/game';

export const WIDTH = 320;
export const HEIGHT = 200;
export const GROUND = 176;
export const RUNNER_X = 36;
export const RUN_W = 12;
export const RUN_H = 14;
export const DUCK_W = 16;
export const DUCK_H = 9;
export const GRAVITY = 1500;
export const JUMP_VELOCITY = -470;
export const JUMP_CUT = -180;
export const FAST_FALL = 1800;
export const POINTS_PER_PIXEL = 0.1;

export const CONFIG: Record<Difficulty, { start: number; max: number; accel: number; birdsAt: number }> = {
  easy: { start: 150, max: 300, accel: 3, birdsAt: 400 },
  normal: { start: 170, max: 360, accel: 4, birdsAt: 250 },
  hard: { start: 200, max: 420, accel: 5, birdsAt: 120 },
};

export type ObstacleKind = 'cactusS' | 'cactusL' | 'cluster' | 'birdLow' | 'birdMid';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Obstacle extends Rect {
  kind: ObstacleKind;
}

export const OBSTACLE_SIZE: Record<ObstacleKind, { w: number; h: number; lift: number }> = {
  cactusS: { w: 8, h: 16, lift: 0 },
  cactusL: { w: 12, h: 24, lift: 0 },
  cluster: { w: 22, h: 16, lift: 0 },
  birdLow: { w: 14, h: 10, lift: 2 },
  birdMid: { w: 14, h: 10, lift: 10 },
};

export interface RunnerState {
  feet: number;
  vy: number;
  onGround: boolean;
  ducking: boolean;
  obstacles: Obstacle[];
  distance: number;
  elapsed: number;
  speed: number;
  untilNext: number;
  alive: boolean;
  started: boolean;
}

export interface RunnerInput {
  jumpPressed: boolean;
  jumpHeld: boolean;
  duckHeld: boolean;
}

export interface RunnerEvents {
  jumped: boolean;
  died: boolean;
  milestone: boolean;
}

export function createRunner(difficulty: Difficulty): RunnerState {
  return {
    feet: GROUND,
    vy: 0,
    onGround: true,
    ducking: false,
    obstacles: [],
    distance: 0,
    elapsed: 0,
    speed: CONFIG[difficulty].start,
    untilNext: 200,
    alive: true,
    started: false,
  };
}

export function scoreOf(state: RunnerState): number {
  return Math.floor(state.distance * POINTS_PER_PIXEL);
}

export function speedAt(difficulty: Difficulty, elapsed: number): number {
  const { start, max, accel } = CONFIG[difficulty];
  return Math.min(max, start + accel * elapsed);
}

export function nextGap(speed: number, random: () => number): number {
  return speed * 0.75 + 40 + random() * speed * 0.9;
}

export function makeObstacle(kind: ObstacleKind, x: number): Obstacle {
  const { w, h, lift } = OBSTACLE_SIZE[kind];
  return { kind, x, y: GROUND - h - lift, w, h };
}

export function chooseObstacle(score: number, birdsAt: number, random: () => number): ObstacleKind {
  if (score >= birdsAt && random() < 0.25) return random() < 0.5 ? 'birdLow' : 'birdMid';
  const r = random();
  return r < 0.45 ? 'cactusS' : r < 0.8 ? 'cactusL' : 'cluster';
}

export function runnerBox(state: RunnerState): Rect {
  if (state.ducking) return { x: RUNNER_X + 1, y: state.feet - DUCK_H + 1, w: DUCK_W - 2, h: DUCK_H - 1 };
  return { x: RUNNER_X + 2, y: state.feet - RUN_H + 2, w: RUN_W - 4, h: RUN_H - 2 };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const shrink = (r: Rect): Rect => ({ x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 });

export function stepRunner(state: RunnerState, dt: number, input: RunnerInput, difficulty: Difficulty, random: () => number): RunnerEvents {
  const events: RunnerEvents = { jumped: false, died: false, milestone: false };
  if (!state.alive) return events;
  if (!state.started) {
    if (!input.jumpPressed) return events;
    state.started = true;
  }

  if (input.jumpPressed && state.onGround) {
    state.vy = JUMP_VELOCITY;
    state.onGround = false;
    events.jumped = true;
  }
  if (!input.jumpHeld && state.vy < JUMP_CUT) state.vy = JUMP_CUT;
  state.vy += (GRAVITY + (input.duckHeld && !state.onGround ? FAST_FALL : 0)) * dt;
  state.feet += state.vy * dt;
  if (state.feet >= GROUND) {
    state.feet = GROUND;
    state.vy = 0;
    state.onGround = true;
  }
  state.ducking = input.duckHeld && state.onGround;

  state.elapsed += dt;
  state.speed = speedAt(difficulty, state.elapsed);
  const dx = state.speed * dt;
  const before = scoreOf(state);
  state.distance += dx;
  if (Math.floor(scoreOf(state) / 100) > Math.floor(before / 100)) events.milestone = true;

  for (const o of state.obstacles) o.x -= dx;
  state.obstacles = state.obstacles.filter((o) => o.x + o.w > -4);
  state.untilNext -= dx;
  if (state.untilNext <= 0) {
    state.obstacles.push(makeObstacle(chooseObstacle(scoreOf(state), CONFIG[difficulty].birdsAt, random), WIDTH + 4));
    state.untilNext = nextGap(state.speed, random);
  }

  const box = runnerBox(state);
  if (state.obstacles.some((o) => overlaps(box, shrink(o)))) {
    state.alive = false;
    events.died = true;
  }
  return events;
}
