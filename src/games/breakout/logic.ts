import type { Difficulty } from '../../types/game';

export const WIDTH = 320;
export const HEIGHT = 360;
export const HUD = 24;
export const BRICK_ROWS = 5;
export const BRICK_COLS = 10;
export const BRICK_W = 30;
export const BRICK_H = 10;
export const BRICK_GAP = 2;
export const BRICK_TOP = 44;
export const ROW_POINTS = [50, 40, 30, 20, 10];
export const PADDLE_Y = 336;
export const PADDLE_H = 6;
export const BALL_R = 3;
export const LIVES = 3;
export const LIFE_BONUS = 100;
export const MAX_BOUNCE = Math.PI / 3;

export const CONFIG: Record<Difficulty, { paddleWidth: number; ballSpeed: number }> = {
  easy: { paddleWidth: 64, ballSpeed: 200 },
  normal: { paddleWidth: 52, ballSpeed: 240 },
  hard: { paddleWidth: 40, ballSpeed: 280 },
};

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Brick extends Rect {
  row: number;
  alive: boolean;
}

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export function createBricks(): Brick[] {
  const bricks: Brick[] = [];
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        x: 1 + col * (BRICK_W + BRICK_GAP),
        y: BRICK_TOP + row * (BRICK_H + BRICK_GAP),
        w: BRICK_W,
        h: BRICK_H,
        row,
        alive: true,
      });
    }
  }
  return bricks;
}

export function bounceVelocity(hitOffset: number, speed: number): { vx: number; vy: number } {
  const offset = Math.max(-1, Math.min(1, hitOffset));
  const angle = offset * MAX_BOUNCE;
  return { vx: speed * Math.sin(angle), vy: -speed * Math.cos(angle) };
}

export function ballSpeed(base: number, level: number, hits: number): number {
  const levelStart = base * (1 + 0.1 * (level - 1));
  return levelStart * Math.min(1.5, 1 + 0.05 * Math.floor(hits / 10));
}

export function circleRect(c: Circle, r: Rect): { nx: number; ny: number } | null {
  const cx = Math.max(r.x, Math.min(c.x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(c.y, r.y + r.h));
  const dx = c.x - cx;
  const dy = c.y - cy;
  if (dx * dx + dy * dy > c.r * c.r) return null;
  if (dx === 0 && dy === 0) {
    const pen = [
      { d: c.x - r.x, nx: -1, ny: 0 },
      { d: r.x + r.w - c.x, nx: 1, ny: 0 },
      { d: c.y - r.y, nx: 0, ny: -1 },
      { d: r.y + r.h - c.y, nx: 0, ny: 1 },
    ].sort((a, b) => a.d - b.d)[0];
    return { nx: pen.nx, ny: pen.ny };
  }
  return Math.abs(dx) > Math.abs(dy) ? { nx: Math.sign(dx), ny: 0 } : { nx: 0, ny: Math.sign(dy) };
}

export function substeps(speed: number, dt: number, maxStep = 2): number {
  return Math.max(1, Math.ceil((speed * dt) / maxStep));
}
