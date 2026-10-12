import type { Difficulty } from '../../types/game';

export const WIDTH = 320;
export const HEIGHT = 320;
export const SHIP_R = 6;
export const TURN_SPEED = 12;
export const MOVE_SPEED = 130;
export const ACCEL = 6;
export const BULLET_SPEED = 280;
export const BULLET_LIFE = 0.85;
export const MAX_BULLETS = 6;
export const FIRE_COOLDOWN = 0.18;
export const HYPER_COOLDOWN = 2;
export const RESPAWN_SHIELD = 3;
export const LIVES = 3;
export const EXTRA_LIFE_EVERY = 5000;
export const SAFE_DISTANCE = 90;

export type RockSize = 0 | 1 | 2;

export const ROCK_RADIUS: Record<RockSize, number> = { 0: 18, 1: 10, 2: 5 };
export const ROCK_POINTS: Record<RockSize, number> = { 0: 20, 1: 50, 2: 100 };
const ROCK_SPEED: Record<RockSize, [number, number]> = { 0: [25, 45], 1: [45, 75], 2: [75, 110] };

export const CONFIG: Record<Difficulty, { startRocks: number; speed: number }> = {
  easy: { startRocks: 2, speed: 0.6 },
  normal: { startRocks: 3, speed: 0.8 },
  hard: { startRocks: 4, speed: 1 },
};

export interface Vec {
  x: number;
  y: number;
}

export interface Ship extends Vec {
  vx: number;
  vy: number;
  angle: number;
  thrusting: boolean;
}

export interface Rock extends Vec {
  vx: number;
  vy: number;
  size: RockSize;
  spin: number;
  angle: number;
  shape: number[];
}

export interface Bullet extends Vec {
  vx: number;
  vy: number;
  life: number;
}

export interface ShipInput {
  dx: number;
  dy: number;
  aim: number | null;
}

export function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

export function wrappedDistance(a: Vec, b: Vec): number {
  let dx = Math.abs(a.x - b.x);
  let dy = Math.abs(a.y - b.y);
  dx = Math.min(dx, WIDTH - dx);
  dy = Math.min(dy, HEIGHT - dy);
  return Math.hypot(dx, dy);
}

export function createShip(): Ship {
  return { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0, angle: -Math.PI / 2, thrusting: false };
}

export function turnToward(angle: number, target: number, maxStep: number): number {
  let diff = (target - angle) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxStep) return target;
  return angle + Math.sign(diff) * maxStep;
}

export function stepShip(ship: Ship, input: ShipInput, dt: number): void {
  const len = Math.hypot(input.dx, input.dy);
  const tx = len ? (input.dx / len) * MOVE_SPEED : 0;
  const ty = len ? (input.dy / len) * MOVE_SPEED : 0;
  const k = Math.min(1, ACCEL * dt);
  ship.vx += (tx - ship.vx) * k;
  ship.vy += (ty - ship.vy) * k;
  ship.thrusting = len > 0;
  const target = input.aim ?? (len ? Math.atan2(input.dy, input.dx) : null);
  if (target !== null) ship.angle = turnToward(ship.angle, target, TURN_SPEED * dt);
  ship.x = wrap(ship.x + ship.vx * dt, WIDTH);
  ship.y = wrap(ship.y + ship.vy * dt, HEIGHT);
}

export function fireBullet(ship: Ship): Bullet {
  const nose = SHIP_R + 1;
  return {
    x: wrap(ship.x + Math.cos(ship.angle) * nose, WIDTH),
    y: wrap(ship.y + Math.sin(ship.angle) * nose, HEIGHT),
    vx: Math.cos(ship.angle) * BULLET_SPEED + ship.vx,
    vy: Math.sin(ship.angle) * BULLET_SPEED + ship.vy,
    life: BULLET_LIFE,
  };
}

export function stepMover(m: Vec & { vx: number; vy: number }, dt: number): void {
  m.x = wrap(m.x + m.vx * dt, WIDTH);
  m.y = wrap(m.y + m.vy * dt, HEIGHT);
}

export function makeShape(random: () => number, points = 10): number[] {
  return Array.from({ length: points }, () => 0.72 + random() * 0.3);
}

export function makeRock(size: RockSize, x: number, y: number, speedScale: number, random: () => number): Rock {
  const [lo, hi] = ROCK_SPEED[size];
  const speed = (lo + random() * (hi - lo)) * speedScale;
  const dir = random() * Math.PI * 2;
  return {
    x,
    y,
    vx: Math.cos(dir) * speed,
    vy: Math.sin(dir) * speed,
    size,
    spin: (random() - 0.5) * 2,
    angle: random() * Math.PI * 2,
    shape: makeShape(random),
  };
}

export function rocksForWave(wave: number, difficulty: Difficulty): number {
  return Math.min(11, CONFIG[difficulty].startRocks + wave - 1);
}

export function speedScale(wave: number, difficulty: Difficulty): number {
  return CONFIG[difficulty].speed * (1 + Math.min(0.5, (wave - 1) * 0.06));
}

export function spawnWave(wave: number, difficulty: Difficulty, avoid: Vec, random: () => number): Rock[] {
  const rocks: Rock[] = [];
  const count = rocksForWave(wave, difficulty);
  const scale = speedScale(wave, difficulty);
  while (rocks.length < count) {
    const onVertical = random() < 0.5;
    const x = onVertical ? (random() < 0.5 ? 0 : WIDTH - 1) : random() * WIDTH;
    const y = onVertical ? random() * HEIGHT : random() < 0.5 ? 0 : HEIGHT - 1;
    if (wrappedDistance({ x, y }, avoid) < SAFE_DISTANCE) continue;
    rocks.push(makeRock(0, x, y, scale, random));
  }
  return rocks;
}

export function splitRock(rock: Rock, scale: number, random: () => number): Rock[] {
  if (rock.size === 2) return [];
  const next = (rock.size + 1) as RockSize;
  return [makeRock(next, rock.x, rock.y, scale, random), makeRock(next, rock.x, rock.y, scale, random)];
}

export function circlesTouch(a: Vec, ra: number, b: Vec, rb: number): boolean {
  return wrappedDistance(a, b) < ra + rb;
}

export function safeSpot(rocks: Rock[], random: () => number): Vec {
  for (let tries = 0; tries < 40; tries++) {
    const p = { x: 20 + random() * (WIDTH - 40), y: 20 + random() * (HEIGHT - 40) };
    if (rocks.every((r) => wrappedDistance(p, r) > ROCK_RADIUS[r.size] + 30)) return p;
  }
  return { x: WIDTH / 2, y: HEIGHT / 2 };
}

export function extraLives(before: number, after: number): number {
  return Math.floor(after / EXTRA_LIFE_EVERY) - Math.floor(before / EXTRA_LIFE_EVERY);
}
