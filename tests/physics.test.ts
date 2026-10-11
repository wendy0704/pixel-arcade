import { describe, expect, it } from 'vitest';
import { ballSpeed, bounceVelocity, circleRect, createBricks, MAX_BOUNCE, rallyBoost, substeps } from '../src/games/breakout/logic';
import { advance, MAX_FRAME, STEP } from '../src/core/game-loop';
import { computeScale } from '../src/core/canvas';
import {
  aliveBounds,
  createFormation,
  createShields,
  hitShield,
  shooters,
  stepFormation,
  stepInterval,
  WIDTH,
} from '../src/games/invaders/logic';

describe('breakout', () => {
  it('lays out 50 bricks inside the field', () => {
    const bricks = createBricks();
    expect(bricks).toHaveLength(50);
    expect(Math.max(...bricks.map((b) => b.x + b.w))).toBeLessThanOrEqual(320);
  });

  it('bounces straight up from the paddle centre and at most 60 degrees at the edge', () => {
    const centre = bounceVelocity(0, 200);
    expect(centre.vx).toBeCloseTo(0);
    expect(centre.vy).toBeCloseTo(-200);
    const edge = bounceVelocity(5, 200);
    expect(Math.atan2(edge.vx, -edge.vy)).toBeCloseTo(MAX_BOUNCE);
  });

  it('speeds up by 4% per paddle return up to 1.6x', () => {
    expect(ballSpeed(200, 1, 0)).toBe(200);
    expect(ballSpeed(200, 1, 1)).toBeCloseTo(208);
    expect(ballSpeed(200, 1, 10)).toBeCloseTo(280);
    expect(ballSpeed(200, 1, 15)).toBeCloseTo(320);
    expect(ballSpeed(200, 1, 1000)).toBeCloseTo(320);
    expect(ballSpeed(200, 2, 0)).toBeCloseTo(220);
    expect(rallyBoost(5)).toBeCloseTo(1.2);
  });

  it('detects collision side', () => {
    const rect = { x: 10, y: 10, w: 30, h: 10 };
    expect(circleRect({ x: 25, y: 22, r: 3 }, rect)).toEqual({ nx: 0, ny: 1 });
    expect(circleRect({ x: 8, y: 15, r: 3 }, rect)).toEqual({ nx: -1, ny: 0 });
    expect(circleRect({ x: 25, y: 30, r: 3 }, rect)).toBeNull();
  });

  it('uses enough substeps to avoid tunnelling', () => {
    expect(substeps(300, 1 / 60)).toBe(3);
    expect(substeps(10, 1 / 60)).toBe(1);
  });
});

describe('game loop', () => {
  it('runs a fixed number of steps for elapsed time', () => {
    const r = advance(0, 0.05);
    expect(r.steps).toBe(3);
    expect(r.accumulator).toBeCloseTo(0.05 - 3 * STEP);
  });

  it('clamps long frames to avoid the spiral of death', () => {
    expect(advance(0, 5).steps).toBe(Math.floor(MAX_FRAME / STEP));
  });

  it('scales canvases by integer factors when there is room', () => {
    expect(computeScale(700, 700, 320, 320)).toBe(2);
    expect(computeScale(300, 600, 480, 276)).toBeCloseTo(0.625);
    expect(computeScale(374, 600, 288, 320)).toBeCloseTo(374 / 288);
  });
});

describe('invaders', () => {
  it('drops and reverses at the edge', () => {
    const f = createFormation(1);
    let drops = 0;
    for (let i = 0; i < 200 && drops === 0; i++) if (stepFormation(f) === 'drop') drops++;
    expect(drops).toBe(1);
    expect(f.dir).toBe(-1);
    const b = aliveBounds(f)!;
    expect(b.maxX).toBeLessThanOrEqual(WIDTH);
  });

  it('starts lower on later waves, up to a limit', () => {
    expect(createFormation(2).offsetY).toBe(8);
    expect(createFormation(10).offsetY).toBe(24);
  });

  it('moves faster as aliens die', () => {
    expect(stepInterval(0.6, 1)).toBeLessThan(stepInterval(0.6, 55));
  });

  it('only the bottom alien of each column shoots', () => {
    const f = createFormation(1);
    expect(shooters(f).every((a) => a.row === 4)).toBe(true);
    f.aliens.filter((a) => a.col === 0 && a.row === 4).forEach((a) => (a.alive = false));
    expect(shooters(f).find((a) => a.col === 0)?.row).toBe(3);
  });

  it('erodes shields where they are hit', () => {
    const [s] = createShields();
    const before = s.cells.filter(Boolean).length;
    expect(hitShield(s, { x: s.x + 10, y: s.y, w: 1, h: 4 })).toBe(true);
    expect(s.cells.filter(Boolean).length).toBeLessThan(before);
    expect(hitShield(s, { x: s.x - 50, y: s.y, w: 1, h: 4 })).toBe(false);
  });
});
