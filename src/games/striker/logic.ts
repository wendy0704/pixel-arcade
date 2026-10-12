import type { Difficulty } from '../../types/game';

export const WIDTH = 240;
export const HEIGHT = 320;
export const PLAYER_W = 12;
export const PLAYER_H = 12;
export const HITBOX = 4;
export const PLAYER_SPEED = 130;
export const SHOT_SPEED = 330;
export const FIRE_INTERVAL = 0.12;
export const MAX_POWER = 4;
export const LIVES = 3;
export const BOSS_EVERY = 5;
export const INVULNERABLE = 2;

export type EnemyKind = 'drone' | 'diver' | 'gunship' | 'boss';

export const ENEMY: Record<EnemyKind, { w: number; h: number; hp: number; points: number }> = {
  drone: { w: 10, h: 6, hp: 1, points: 100 },
  diver: { w: 10, h: 10, hp: 2, points: 150 },
  gunship: { w: 14, h: 9, hp: 7, points: 400 },
  boss: { w: 46, h: 18, hp: 140, points: 5000 },
};

export const CONFIG: Record<Difficulty, { bulletSpeed: number; fireRate: number; bombs: number }> = {
  easy: { bulletSpeed: 80, fireRate: 0.7, bombs: 3 },
  normal: { bulletSpeed: 100, fireRate: 1, bombs: 2 },
  hard: { bulletSpeed: 125, fireRate: 1.35, bombs: 2 },
};

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Spawn {
  t: number;
  kind: EnemyKind;
  x: number;
}

export interface Shot {
  dx: number;
  angle: number;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function clampPlayer(x: number, y: number): { x: number; y: number } {
  return { x: clamp(x, PLAYER_W / 2, WIDTH - PLAYER_W / 2), y: clamp(y, 24, HEIGHT - PLAYER_H / 2 - 2) };
}

export function shotPattern(power: number): Shot[] {
  const p = clamp(Math.floor(power), 1, MAX_POWER);
  if (p === 1) return [{ dx: 0, angle: 0 }];
  if (p === 2) return [{ dx: -3, angle: 0 }, { dx: 3, angle: 0 }];
  if (p === 3) return [{ dx: 0, angle: 0 }, { dx: -3, angle: -0.18 }, { dx: 3, angle: 0.18 }];
  return [
    { dx: -3, angle: 0 },
    { dx: 3, angle: 0 },
    { dx: -5, angle: -0.22 },
    { dx: 5, angle: 0.22 },
  ];
}

export function aimAt(fromX: number, fromY: number, toX: number, toY: number, speed: number): { vx: number; vy: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy) || 1;
  return { vx: (dx / len) * speed, vy: (dy / len) * speed };
}

export function fan(count: number, spread: number, baseAngle: number, speed: number): { vx: number; vy: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const a = baseAngle + (count === 1 ? 0 : (i / (count - 1) - 0.5) * spread);
    return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed };
  });
}

export function isBossWave(wave: number): boolean {
  return wave % BOSS_EVERY === 0;
}

export function bossHp(wave: number): number {
  return ENEMY.boss.hp + (Math.floor(wave / BOSS_EVERY) - 1) * 60;
}

export function buildWave(wave: number, random: () => number): Spawn[] {
  if (isBossWave(wave)) return [{ t: 0.5, kind: 'boss', x: WIDTH / 2 }];
  const spawns: Spawn[] = [];
  const groups = Math.min(5, 2 + Math.floor(wave / 2));
  for (let gi = 0; gi < groups; gi++) {
    const start = gi * 2.4;
    const pick = random();
    if (pick < 0.45) {
      const left = random() < 0.5;
      for (let i = 0; i < 5; i++) {
        const x = left ? 30 + i * 22 : WIDTH - 30 - i * 22;
        spawns.push({ t: start + i * 0.25, kind: 'drone', x });
      }
    } else if (pick < 0.8) {
      const center = 50 + random() * (WIDTH - 100);
      [-2, -1, 0, 1, 2].forEach((k, i) => spawns.push({ t: start + Math.abs(k) * 0.3 + i * 0.01, kind: 'diver', x: clamp(center + k * 20, 12, WIDTH - 12) }));
    } else {
      const count = wave >= 3 ? 2 : 1;
      for (let i = 0; i < count; i++) spawns.push({ t: start + i * 0.6, kind: 'gunship', x: count === 1 ? WIDTH / 2 : 60 + i * 120 });
    }
  }
  return spawns.sort((a, b) => a.t - b.t);
}

export function dropsPower(kills: number, kind: EnemyKind): boolean {
  return kind === 'gunship' || kind === 'boss' || kills % 15 === 0;
}

export function dropsBomb(kills: number): boolean {
  return kills > 0 && kills % 40 === 0;
}
