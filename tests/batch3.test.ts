import { describe, expect, it } from 'vitest';
import * as rocks from '../src/games/rocks/logic';
import * as striker from '../src/games/striker/logic';
import { BOSS, DIVER, DRONE, GUNSHIP, PLAYER as STRIKER_PLAYER } from '../src/games/striker/sprites';
import * as maze from '../src/games/maze/logic';
import { BEETLE_FRAMES, SLIME_FRAMES, STAR } from '../src/games/maze/sprites';
import * as connect from '../src/games/connect/logic';
import * as reversi from '../src/games/reversi/logic';
import * as gomoku from '../src/games/gomoku/logic';
import { constant, seeded } from './helpers';

const rectangular = (rows: readonly string[]) => rows.every((r) => r.length === rows[0].length);

describe('rocks', () => {
  it('wraps positions around the screen', () => {
    expect(rocks.wrap(-1, 320)).toBe(319);
    expect(rocks.wrap(321, 320)).toBe(1);
    expect(rocks.wrappedDistance({ x: 2, y: 10 }, { x: 318, y: 10 })).toBe(4);
  });

  it('caps ship speed and turns', () => {
    const ship = rocks.createShip();
    for (let i = 0; i < 600; i++) rocks.stepShip(ship, { left: false, right: false, thrust: true }, 1 / 60);
    expect(Math.hypot(ship.vx, ship.vy)).toBeLessThanOrEqual(rocks.MAX_SPEED + 1e-9);
    const turn = rocks.createShip();
    rocks.stepShip(turn, { left: false, right: true, thrust: false }, 0.5);
    expect(turn.angle).toBeCloseTo(-Math.PI / 2 + rocks.TURN_SPEED * 0.5);
  });

  it('splits large rocks into two smaller ones and destroys small ones', () => {
    const r = seeded(1);
    const big = rocks.makeRock(0, 50, 50, 1, r);
    const parts = rocks.splitRock(big, 1, r);
    expect(parts).toHaveLength(2);
    parts.forEach((p) => expect(p.size).toBe(1));
    expect(rocks.splitRock(rocks.makeRock(2, 0, 0, 1, r), 1, r)).toEqual([]);
  });

  it('spawns waves away from the ship with more rocks each wave', () => {
    const r = seeded(2);
    const ship = rocks.createShip();
    const wave = rocks.spawnWave(1, 'normal', ship, r);
    expect(wave).toHaveLength(4);
    wave.forEach((rock) => expect(rocks.wrappedDistance(rock, ship)).toBeGreaterThanOrEqual(rocks.SAFE_DISTANCE));
    expect(rocks.rocksForWave(3, 'normal')).toBe(6);
    expect(rocks.rocksForWave(99, 'hard')).toBe(11);
  });

  it('awards an extra life every 5000 points', () => {
    expect(rocks.extraLives(4990, 5010)).toBe(1);
    expect(rocks.extraLives(100, 200)).toBe(0);
  });

  it('bullets inherit ship velocity', () => {
    const ship = { ...rocks.createShip(), vx: 50, vy: 0, angle: 0 };
    const b = rocks.fireBullet(ship);
    expect(b.vx).toBeCloseTo(rocks.BULLET_SPEED + 50);
  });
});

describe('striker', () => {
  it('shot patterns grow with power', () => {
    expect(striker.shotPattern(1)).toHaveLength(1);
    expect(striker.shotPattern(2)).toHaveLength(2);
    expect(striker.shotPattern(3)).toHaveLength(3);
    expect(striker.shotPattern(9)).toHaveLength(4);
  });

  it('aims bullets at the target with the given speed', () => {
    const v = striker.aimAt(0, 0, 30, 40, 100);
    expect(v.vx).toBeCloseTo(60);
    expect(v.vy).toBeCloseTo(80);
  });

  it('spreads a fan symmetrically', () => {
    const f = striker.fan(5, 1, Math.PI / 2, 100);
    expect(f).toHaveLength(5);
    expect(f[2].vx).toBeCloseTo(0);
    expect(f[0].vx).toBeCloseTo(-f[4].vx);
  });

  it('sends a boss every fifth wave', () => {
    const r = seeded(3);
    expect(striker.buildWave(5, r)).toEqual([{ t: 0.5, kind: 'boss', x: striker.WIDTH / 2 }]);
    const w = striker.buildWave(1, r);
    expect(w.length).toBeGreaterThan(0);
    expect(w.some((s) => s.kind === 'boss')).toBe(false);
    for (let i = 1; i < w.length; i++) expect(w[i].t).toBeGreaterThanOrEqual(w[i - 1].t);
    expect(striker.bossHp(10)).toBeGreaterThan(striker.bossHp(5));
  });

  it('keeps the player inside the screen', () => {
    expect(striker.clampPlayer(-50, 999)).toEqual({ x: striker.PLAYER_W / 2, y: striker.HEIGHT - striker.PLAYER_H / 2 - 2 });
  });

  it('sprites match their hit boxes', () => {
    const sizes: [string[], number, number][] = [
      [DRONE, striker.ENEMY.drone.w, striker.ENEMY.drone.h],
      [DIVER, striker.ENEMY.diver.w, striker.ENEMY.diver.h],
      [GUNSHIP, striker.ENEMY.gunship.w, striker.ENEMY.gunship.h],
      [BOSS, striker.ENEMY.boss.w, striker.ENEMY.boss.h],
      [STRIKER_PLAYER, striker.PLAYER_W, striker.PLAYER_H],
    ];
    for (const [rows, w, h] of sizes) {
      expect(rectangular(rows)).toBe(true);
      expect(rows[0].length).toBe(w);
      expect(rows.length).toBe(h);
    }
  });
});

describe('maze', () => {
  it('has a rectangular maze where every dot is reachable', () => {
    expect(maze.MAZE).toHaveLength(maze.ROWS);
    maze.MAZE.forEach((row) => expect(row).toHaveLength(maze.COLS));
    const dots = maze.createDots();
    const reach = maze.reachable(maze.startPoint());
    expect(dots.size).toBeGreaterThan(100);
    for (const key of dots.keys()) expect(reach.has(key)).toBe(true);
    expect(reach.has(maze.EXIT.y * maze.COLS + maze.EXIT.x)).toBe(true);
  });

  it('wraps through the side tunnel', () => {
    expect(maze.step({ x: 0, y: 9 }, 'left')).toEqual({ x: maze.COLS - 1, y: 9 });
    expect(maze.passable(-1, 9)).toBe(true);
  });

  it('only lets enemies through the pen door when allowed', () => {
    expect(maze.passable(maze.DOOR.x, maze.DOOR.y)).toBe(false);
    expect(maze.passable(maze.DOOR.x, maze.DOOR.y, true)).toBe(true);
  });

  it('never reverses unless at a dead end and moves toward the target', () => {
    const at = { x: 1, y: 3 };
    expect(maze.options(at, 'left')).not.toContain('right');
    expect(maze.chooseToward({ x: 4, y: 3 }, 'right', { x: 18, y: 3 })).toBe('right');
    expect(maze.chooseToward({ x: 4, y: 3 }, 'down', { x: 4, y: 20 })).toBe('down');
  });

  it('gives each persona its own chase target', () => {
    const player = { x: 9, y: 15 };
    expect(maze.chaseTarget('stalker', { x: 1, y: 1 }, player, 'left', { x: 0, y: 0 })).toEqual(player);
    expect(maze.chaseTarget('ambusher', { x: 1, y: 1 }, player, 'left', { x: 0, y: 0 })).toEqual({ x: 6, y: 15 });
    expect(maze.chaseTarget('shy', { x: 9, y: 14 }, player, 'up', { x: 0, y: 0 })).toEqual(maze.CORNERS.shy);
    expect(maze.chaseTarget('shy', { x: 1, y: 1 }, player, 'up', { x: 0, y: 0 })).toEqual(player);
  });

  it('follows the scatter and chase schedule', () => {
    expect(maze.modeAt(0)).toBe('scatter');
    expect(maze.modeAt(7)).toBe('chase');
    expect(maze.modeAt(27)).toBe('scatter');
    expect(maze.modeAt(9999)).toBe('chase');
  });

  it('doubles points for each enemy eaten in a row', () => {
    expect([0, 1, 2, 3, 4].map(maze.chainPoints)).toEqual([200, 400, 800, 1600, 1600]);
  });

  it('shortens fright time on later levels', () => {
    expect(maze.frightTime('normal', 1)).toBe(6);
    expect(maze.frightTime('normal', 99)).toBe(2);
  });

  it('sprites are rectangular', () => {
    [...SLIME_FRAMES, ...BEETLE_FRAMES, STAR].forEach((f) => expect(rectangular(f)).toBe(true));
  });
});

describe('connect four', () => {
  const play = (cols: number[]) => {
    const b = connect.createBoard();
    cols.forEach((c, i) => connect.drop(b, c, i % 2 === 0 ? connect.PLAYER : connect.CPU));
    return b;
  };

  it('stacks pieces from the bottom', () => {
    const b = play([3, 3]);
    expect(b[connect.index(5, 3)]).toBe(connect.PLAYER);
    expect(b[connect.index(4, 3)]).toBe(connect.CPU);
    expect(connect.dropRow(play([0, 0, 0, 0, 0, 0]), 0)).toBe(-1);
  });

  it('detects horizontal, vertical and diagonal wins', () => {
    expect(connect.findWin(play([0, 0, 1, 1, 2, 2, 3]))?.who).toBe(connect.PLAYER);
    expect(connect.findWin(play([0, 1, 0, 1, 0, 1, 0]))?.who).toBe(connect.PLAYER);
    expect(connect.findWin(play([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]))?.who).toBe(connect.PLAYER);
    expect(connect.findWin(play([0, 1]))).toBeNull();
  });

  it('takes a winning move and blocks the opponent', () => {
    const b1 = connect.createBoard();
    [0, 1, 2].forEach((c) => connect.drop(b1, c, connect.CPU));
    expect(connect.chooseColumn(b1, connect.CPU, 'normal', constant(0.9))).toBe(3);
    const b2 = connect.createBoard();
    [0, 1, 2].forEach((c) => connect.drop(b2, c, connect.PLAYER));
    expect(connect.chooseColumn(b2, connect.CPU, 'normal', constant(0.9))).toBe(3);
  });

  it('hard AI answers quickly', () => {
    const t = performance.now();
    connect.chooseColumn(connect.createBoard(), connect.CPU, 'hard', constant(0.9));
    expect(performance.now() - t).toBeLessThan(1500);
  });
});

describe('reversi', () => {
  it('starts with four discs and four legal moves', () => {
    const b = reversi.createBoard();
    expect(reversi.count(b)).toEqual({ black: 2, white: 2 });
    expect(reversi.legalMoves(b, reversi.BLACK).sort((a, z) => a - z)).toEqual([19, 26, 37, 44]);
  });

  it('flips sandwiched discs in every direction', () => {
    const b = reversi.createBoard();
    expect(reversi.play(b, 19, reversi.BLACK)).toEqual([27]);
    expect(reversi.count(b)).toEqual({ black: 4, white: 1 });
    expect(reversi.play(b, 0, reversi.WHITE)).toEqual([]);
  });

  it('ends when nobody can move', () => {
    const full = new Array(64).fill(reversi.BLACK) as reversi.Board;
    expect(reversi.isOver(full)).toBe(true);
    expect(reversi.isOver(reversi.createBoard())).toBe(false);
  });

  it('prefers corners', () => {
    const b = new Array(64).fill(0) as reversi.Board;
    b[9] = reversi.BLACK;
    b[18] = reversi.WHITE;
    b[20] = reversi.BLACK;
    b[19] = reversi.BLACK;
    expect(reversi.legalMoves(b, reversi.WHITE)).toContain(0);
    expect(reversi.chooseMove(b, reversi.WHITE, 'hard', constant(0.5))).toBe(0);
  });

  it('plays a full game between AIs without illegal moves', () => {
    const b = reversi.createBoard();
    const r = seeded(4);
    let who: reversi.Cell = reversi.BLACK;
    let turns = 0;
    while (!reversi.isOver(b) && turns < 200) {
      const m = reversi.chooseMove(b, who, 'normal', r);
      if (m >= 0) expect(reversi.play(b, m, who).length).toBeGreaterThan(0);
      who = reversi.other(who);
      turns++;
    }
    const { black, white } = reversi.count(b);
    expect(black + white).toBeLessThanOrEqual(64);
    expect(reversi.isOver(b)).toBe(true);
  });
});

describe('gomoku', () => {
  const at = (r: number, c: number) => r * gomoku.N + c;

  it('detects five in a row in all directions', () => {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const b = gomoku.createBoard();
      for (let k = 0; k < 5; k++) b[at(7 + dr * k, 5 + dc * k)] = gomoku.BLACK;
      expect(gomoku.fiveAt(b, at(7, 5))).toHaveLength(5);
    }
    const four = gomoku.createBoard();
    for (let k = 0; k < 4; k++) four[at(0, k)] = gomoku.BLACK;
    expect(gomoku.fiveAt(four, at(0, 0))).toBeNull();
  });

  it('scores open fours above closed fours and threes', () => {
    expect(gomoku.patternScore(4, 2)).toBeGreaterThan(gomoku.patternScore(4, 1));
    expect(gomoku.patternScore(4, 1)).toBeGreaterThan(gomoku.patternScore(3, 1));
    expect(gomoku.patternScore(3, 0)).toBe(0);
  });

  it('opens in the centre and only considers nearby points', () => {
    const b = gomoku.createBoard();
    expect(gomoku.candidates(b)).toEqual([at(7, 7)]);
    b[at(7, 7)] = gomoku.BLACK;
    expect(gomoku.candidates(b)).toHaveLength(24);
  });

  it('wins when it can and blocks an open four threat', () => {
    const win = gomoku.createBoard();
    for (let k = 0; k < 4; k++) win[at(3, 3 + k)] = gomoku.WHITE;
    for (let k = 0; k < 3; k++) win[at(9, 3 + k)] = gomoku.BLACK;
    expect([at(3, 2), at(3, 7)]).toContain(gomoku.chooseMove(win, gomoku.WHITE, 'easy', constant(0.5)));
    const block = gomoku.createBoard();
    for (let k = 0; k < 4; k++) block[at(5, 4 + k)] = gomoku.BLACK;
    block[at(5, 3)] = gomoku.WHITE;
    expect(gomoku.chooseMove(block, gomoku.WHITE, 'normal', constant(0.5))).toBe(at(5, 8));
  });

  it('rewards quicker wins', () => {
    expect(gomoku.winScore(5)).toBe(1000);
    expect(gomoku.winScore(20)).toBe(850);
    expect(gomoku.winScore(500)).toBe(100);
  });
});
