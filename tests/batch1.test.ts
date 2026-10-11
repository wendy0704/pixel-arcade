import { describe, expect, it } from 'vitest';
import {
  BIRD_H,
  BIRD_X,
  CONFIG as FLYER,
  createFlyer,
  EDGE_MARGIN,
  flap,
  FLAP_VELOCITY,
  GROUND,
  hitsPipe,
  PIPE_W,
  randomGapY,
  speedFor,
  stepFlyer,
} from '../src/games/flyer/logic';
import { BIRD_FRAMES } from '../src/games/flyer/sprites';
import {
  chooseObstacle,
  createRunner,
  makeObstacle,
  nextGap,
  overlaps,
  runnerBox,
  scoreOf,
  speedAt,
  stepRunner,
  GROUND as RUN_GROUND,
  CONFIG as RUNNER,
} from '../src/games/runner/logic';
import { BAT_FRAMES, CACTUS_L, CACTUS_S, DUCK_FRAME, RUN_FRAMES } from '../src/games/runner/sprites';
import { formatJudgement, generateSecret, judge, validateGuess } from '../src/games/bulls/logic';
import { constant, seeded } from './helpers';

const rectangular = (rows: string[]) => rows.every((r) => r.length === rows[0].length);

describe('pixel flyer', () => {
  it('waits for the first flap before falling', () => {
    const s = createFlyer();
    const y = s.y;
    stepFlyer(s, 1, 'normal', constant(0.5));
    expect(s.y).toBe(y);
    expect(flap(s)).toBe(true);
    expect(s.vy).toBe(FLAP_VELOCITY);
  });

  it('falls under gravity and dies on the ground', () => {
    const s = createFlyer();
    flap(s);
    let died = false;
    for (let i = 0; i < 300 && !died; i++) died = stepFlyer(s, 1 / 60, 'normal', constant(0.5)).died;
    expect(died).toBe(true);
    expect(s.y + BIRD_H).toBe(GROUND);
    expect(s.grounded).toBe(true);
  });

  it('keeps pipe gaps away from the ceiling and ground', () => {
    for (const d of ['easy', 'normal', 'hard'] as const) {
      const gap = FLYER[d].gap;
      expect(randomGapY(gap, constant(0)) - gap / 2).toBe(EDGE_MARGIN);
      expect(randomGapY(gap, constant(1)) + gap / 2).toBe(GROUND - EDGE_MARGIN);
    }
  });

  it('collides with a pipe only outside the gap', () => {
    const pipe = { x: BIRD_X, gapY: 150, passed: false };
    expect(hitsPipe(150 - BIRD_H / 2, pipe, 86)).toBe(false);
    expect(hitsPipe(100, pipe, 86)).toBe(true);
    expect(hitsPipe(190, pipe, 86)).toBe(true);
    expect(hitsPipe(100, { ...pipe, x: BIRD_X + 40 }, 86)).toBe(false);
  });

  it('scores once when a pipe passes the bird', () => {
    const s = createFlyer();
    s.started = true;
    s.pipes = [{ x: BIRD_X - PIPE_W + 1, gapY: s.y + BIRD_H / 2, passed: false }];
    s.untilNextPipe = 9999;
    const first = stepFlyer(s, 0.05, 'normal', constant(0.5));
    const second = stepFlyer(s, 0.05, 'normal', constant(0.5));
    expect(first.scored).toBe(true);
    expect(second.scored).toBe(false);
    expect(s.score).toBe(1);
  });

  it('speeds up gradually with a cap', () => {
    expect(speedFor('normal', 0)).toBe(85);
    expect(speedFor('normal', 5)).toBe(88);
    expect(speedFor('normal', 1000)).toBe(115);
  });

  it('bird frames are rectangular', () => {
    BIRD_FRAMES.forEach((f) => expect(rectangular(f)).toBe(true));
  });
});

describe('pixel runner', () => {
  it('starts on the first jump', () => {
    const s = createRunner('normal');
    stepRunner(s, 0.1, { jumpPressed: false, jumpHeld: false, duckHeld: false }, 'normal', constant(0.5));
    expect(s.started).toBe(false);
    const ev = stepRunner(s, 0.016, { jumpPressed: true, jumpHeld: true, duckHeld: false }, 'normal', constant(0.5));
    expect(s.started).toBe(true);
    expect(ev.jumped).toBe(true);
    expect(s.onGround).toBe(false);
  });

  it('jumps higher when the button is held', () => {
    const peak = (hold: boolean) => {
      const s = createRunner('easy');
      s.started = true;
      s.untilNext = 1e9;
      let min = RUN_GROUND;
      stepRunner(s, 1 / 60, { jumpPressed: true, jumpHeld: true, duckHeld: false }, 'easy', constant(0.5));
      for (let i = 0; i < 90; i++) {
        stepRunner(s, 1 / 60, { jumpPressed: false, jumpHeld: hold, duckHeld: false }, 'easy', constant(0.5));
        min = Math.min(min, s.feet);
      }
      return RUN_GROUND - min;
    };
    expect(peak(true)).toBeGreaterThan(peak(false) * 2);
    expect(peak(true)).toBeGreaterThan(40);
  });

  it('ducking avoids the mid bat but not the low bat', () => {
    const s = createRunner('normal');
    s.ducking = true;
    const duck = runnerBox(s);
    const mid = makeObstacle('birdMid', duck.x);
    const low = makeObstacle('birdLow', duck.x);
    const shrink = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 });
    expect(overlaps(duck, shrink(mid))).toBe(false);
    expect(overlaps(duck, shrink(low))).toBe(true);
    s.ducking = false;
    expect(overlaps(runnerBox(s), shrink(mid))).toBe(true);
  });

  it('accelerates up to the difficulty maximum', () => {
    expect(speedAt('normal', 0)).toBe(RUNNER.normal.start);
    expect(speedAt('normal', 10)).toBe(RUNNER.normal.start + 40);
    expect(speedAt('normal', 1e6)).toBe(RUNNER.normal.max);
  });

  it('leaves at least a jump worth of space between obstacles', () => {
    for (const speed of [150, 300, 420]) expect(nextGap(speed, constant(0)) / speed).toBeGreaterThan(0.7);
  });

  it('only spawns bats after the difficulty threshold', () => {
    const r = seeded(4);
    const early = Array.from({ length: 200 }, () => chooseObstacle(0, 250, r));
    expect(early.some((k) => k.startsWith('bird'))).toBe(false);
    const late = Array.from({ length: 200 }, () => chooseObstacle(500, 250, r));
    expect(late.some((k) => k.startsWith('bird'))).toBe(true);
  });

  it('dies on collision and scores by distance', () => {
    const s = createRunner('normal');
    s.started = true;
    s.untilNext = 1e9;
    s.obstacles = [makeObstacle('cactusL', 44)];
    const ev = stepRunner(s, 1 / 60, { jumpPressed: false, jumpHeld: false, duckHeld: false }, 'normal', constant(0.5));
    expect(ev.died).toBe(true);
    const t = createRunner('normal');
    t.distance = 1234;
    expect(scoreOf(t)).toBe(123);
  });

  it('sprites are rectangular', () => {
    [...RUN_FRAMES, DUCK_FRAME, CACTUS_S, CACTUS_L, ...BAT_FRAMES].forEach((f) => expect(rectangular(f)).toBe(true));
  });
});

describe('1A2B', () => {
  it('generates secrets with distinct digits', () => {
    const r = seeded(8);
    for (const len of [3, 4, 5]) {
      for (let i = 0; i < 50; i++) {
        const s = generateSecret(len, r);
        expect(s).toMatch(/^\d+$/);
        expect(s).toHaveLength(len);
        expect(new Set(s).size).toBe(len);
      }
    }
  });

  it.each([
    ['1234', '1234', 4, 0],
    ['1234', '4321', 0, 4],
    ['1234', '1243', 2, 2],
    ['1234', '5678', 0, 0],
    ['1234', '1567', 1, 0],
    ['0981', '1890', 0, 4],
  ])('secret %s guess %s -> %iA%iB', (secret, guess, a, b) => {
    expect(judge(secret, guess)).toEqual({ a, b });
  });

  it('validates guesses', () => {
    expect(validateGuess('123', 4)).toBe('length');
    expect(validateGuess('1123', 4)).toBe('repeat');
    expect(validateGuess('12a4', 4)).toBe('digits');
    expect(validateGuess('1234', 4, [{ guess: '1234', a: 0, b: 0 }])).toBe('duplicate');
    expect(validateGuess('0123', 4)).toBeNull();
  });

  it('agrees with a real play history reported from a phone', () => {
    const history: [string, string][] = [
      ['1234', '0A2B'],
      ['1256', '0A2B'],
      ['7890', '1A0B'],
      ['1278', '0A2B'],
      ['1290', '0A1B'],
    ];
    for (const [guess, result] of history) expect(formatJudgement(judge('2845', guess))).toBe(result);
  });

  it('formats results', () => {
    expect(formatJudgement({ a: 1, b: 2 })).toBe('1A2B');
  });
});
