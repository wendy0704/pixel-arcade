import type { Difficulty } from '../../types/game';

export const WIDTH = 240;
export const HEIGHT = 320;
export const GROUND = 296;
export const BIRD_X = 60;
export const BIRD_SCALE = 2;
export const BIRD_W = 12 * BIRD_SCALE;
export const BIRD_H = 8 * BIRD_SCALE;
export const PIPE_W = 28;
export const GRAVITY = 900;
export const FLAP_VELOCITY = -260;
export const MAX_FALL = 420;
export const START_Y = HEIGHT / 2 - 20;
export const EDGE_MARGIN = 40;

export const CONFIG: Record<Difficulty, { gap: number; speed: number; spacing: number }> = {
  easy: { gap: 100, speed: 70, spacing: 150 },
  normal: { gap: 86, speed: 85, spacing: 140 },
  hard: { gap: 74, speed: 100, spacing: 130 },
};

export interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

export interface FlyerState {
  y: number;
  vy: number;
  pipes: Pipe[];
  score: number;
  alive: boolean;
  started: boolean;
  grounded: boolean;
  untilNextPipe: number;
  scroll: number;
}

export interface StepEvents {
  scored: boolean;
  died: boolean;
}

export function createFlyer(): FlyerState {
  return { y: START_Y, vy: 0, pipes: [], score: 0, alive: true, started: false, grounded: false, untilNextPipe: 60, scroll: 0 };
}

export function flap(state: FlyerState): boolean {
  if (!state.alive) return false;
  state.started = true;
  state.vy = FLAP_VELOCITY;
  return true;
}

export function speedFor(difficulty: Difficulty, score: number): number {
  return CONFIG[difficulty].speed + Math.min(30, Math.floor(score / 5) * 3);
}

export function randomGapY(gap: number, random: () => number): number {
  const min = EDGE_MARGIN + gap / 2;
  const max = GROUND - EDGE_MARGIN - gap / 2;
  return min + random() * (max - min);
}

export function hitsPipe(y: number, pipe: Pipe, gap: number): boolean {
  const left = BIRD_X + 3;
  const right = BIRD_X + BIRD_W - 3;
  if (right <= pipe.x || left >= pipe.x + PIPE_W) return false;
  const top = y + 2;
  const bottom = y + BIRD_H - 2;
  return top < pipe.gapY - gap / 2 || bottom > pipe.gapY + gap / 2;
}

export function stepFlyer(state: FlyerState, dt: number, difficulty: Difficulty, random: () => number): StepEvents {
  const events: StepEvents = { scored: false, died: false };
  if (!state.started || state.grounded) return events;
  const { gap, spacing } = CONFIG[difficulty];

  state.vy = Math.min(MAX_FALL, state.vy + GRAVITY * dt);
  state.y += state.vy * dt;
  if (state.y < 0) {
    state.y = 0;
    state.vy = 0;
  }

  if (state.alive) {
    const speed = speedFor(difficulty, state.score);
    const dx = speed * dt;
    state.scroll += dx;
    for (const p of state.pipes) p.x -= dx;
    state.untilNextPipe -= dx;
    if (state.untilNextPipe <= 0) {
      state.pipes.push({ x: WIDTH, gapY: randomGapY(gap, random), passed: false });
      state.untilNextPipe += spacing;
    }
    state.pipes = state.pipes.filter((p) => p.x + PIPE_W > -8);
    for (const p of state.pipes) {
      if (!p.passed && p.x + PIPE_W < BIRD_X) {
        p.passed = true;
        state.score++;
        events.scored = true;
      }
      if (hitsPipe(state.y, p, gap)) {
        state.alive = false;
        events.died = true;
        break;
      }
    }
  }

  if (state.y + BIRD_H >= GROUND) {
    state.y = GROUND - BIRD_H;
    state.vy = 0;
    state.grounded = true;
    if (state.alive) {
      state.alive = false;
      events.died = true;
    }
  }
  return events;
}
