import type { Difficulty } from '../../types/game';

export const WIDTH = 320;
export const HEIGHT = 240;
export const PADDLE_W = 6;
export const PADDLE_H = 40;
export const PLAYER_X = 12;
export const CPU_X = WIDTH - 12 - PADDLE_W;
export const BALL = 6;
export const WIN_SCORE = 7;
export const MAX_ANGLE = (50 * Math.PI) / 180;
export const POINT_SCORE = 100;
export const RETURN_SCORE = 10;

export const CONFIG: Record<Difficulty, { ballSpeed: number; cpuSpeed: number; cpuError: number; predict: boolean }> = {
  easy: { ballSpeed: 170, cpuSpeed: 150, cpuError: 22, predict: false },
  normal: { ballSpeed: 200, cpuSpeed: 200, cpuError: 12, predict: true },
  hard: { ballSpeed: 240, cpuSpeed: 260, cpuError: 5, predict: true },
};

export function paddleBounce(offset: number, speed: number, dir: 1 | -1): { vx: number; vy: number } {
  const angle = Math.max(-1, Math.min(1, offset)) * MAX_ANGLE;
  return { vx: dir * speed * Math.cos(angle), vy: speed * Math.sin(angle) };
}

export function nextSpeed(current: number, base: number): number {
  return Math.min(base * 2, current * 1.05);
}

export function clampPaddle(centerY: number): number {
  return Math.max(PADDLE_H / 2, Math.min(HEIGHT - PADDLE_H / 2, centerY));
}

export function moveToward(current: number, target: number, maxSpeed: number, dt: number): number {
  const delta = target - current;
  const step = maxSpeed * dt;
  return clampPaddle(Math.abs(delta) <= step ? target : current + Math.sign(delta) * step);
}

export function reflectInto(y: number, top: number, bottom: number): number {
  const range = bottom - top;
  if (range <= 0) return top;
  const period = range * 2;
  const m = (((y - top) % period) + period) % period;
  return top + (m > range ? period - m : m);
}

export function predictY(x: number, y: number, vx: number, vy: number, targetX: number): number {
  if (vx === 0 || (targetX - x) / vx < 0) return HEIGHT / 2;
  const t = (targetX - x) / vx;
  return reflectInto(y + vy * t, BALL / 2, HEIGHT - BALL / 2);
}

export function overlapsPaddle(ballX: number, ballY: number, paddleX: number, paddleY: number): boolean {
  return (
    ballX + BALL / 2 > paddleX &&
    ballX - BALL / 2 < paddleX + PADDLE_W &&
    ballY + BALL / 2 > paddleY - PADDLE_H / 2 &&
    ballY - BALL / 2 < paddleY + PADDLE_H / 2
  );
}
