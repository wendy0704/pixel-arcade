import { describe, expect, it, vi } from 'vitest';
import { createGame, HEIGHT, layout, WIDTH } from '../src/games/watersort/game';
import * as ws from '../src/games/watersort/logic';
import { seeded } from './helpers';

describe('watersort pouring', () => {
  it('pours the whole top run when there is room', () => {
    const tubes: ws.Tube[] = [[0, 1, 1], [2], []];
    expect(ws.topRun(tubes[0])).toBe(2);
    expect(ws.pour(tubes, 0, 2)).toBe(2);
    expect(tubes).toEqual([[0], [2], [1, 1]]);
  });

  it('only pours as much as fits', () => {
    const tubes: ws.Tube[] = [[0, 1, 1, 1], [2, 2, 1]];
    expect(ws.pourAmount(tubes, 0, 1)).toBe(1);
    ws.pour(tubes, 0, 1);
    expect(tubes).toEqual([[0, 1, 1], [2, 2, 1, 1]]);
  });

  it('refuses mismatched colours, full targets, the same tube and finished tubes', () => {
    const tubes: ws.Tube[] = [[0, 1], [2, 2, 2, 0], [3, 3, 3, 3], []];
    expect(ws.canPour(tubes, 0, 1)).toBe(false);
    expect(ws.canPour(tubes, 0, 0)).toBe(false);
    expect(ws.canPour(tubes, 2, 3)).toBe(false);
    expect(ws.canPour(tubes, 3, 0)).toBe(false);
    expect(ws.canPour(tubes, 0, 3)).toBe(true);
  });

  it('detects a solved board', () => {
    expect(ws.isSolved([[1, 1, 1, 1], [], [0, 0, 0, 0]])).toBe(true);
    expect(ws.isSolved([[1, 1, 1], [1], [0, 0, 0, 0]])).toBe(false);
  });

  it('reports when no useful move is left', () => {
    expect(ws.hasMoves([[0, 1, 0, 1], [1, 0, 1, 0]])).toBe(false);
    expect(ws.hasMoves([[0, 1, 0, 1], [1, 0, 1, 0], []])).toBe(true);
    expect(ws.hasMoves([[0, 0, 0, 0], [1, 1, 1, 1], []])).toBe(false);
  });
});

describe('watersort generator', () => {
  it('finds a solution that really solves the board', () => {
    const tubes: ws.Tube[] = [[0, 1, 0, 1], [1, 0, 1, 0], [], []];
    const path = ws.solve(tubes);
    expect(path).not.toBeNull();
    const board = ws.cloneTubes(tubes);
    for (const [a, b] of path!) expect(ws.pour(board, a, b)).toBeGreaterThan(0);
    expect(ws.isSolved(board)).toBe(true);
  });

  it.each(['easy', 'normal', 'hard'] as const)('builds a solvable %s level with every colour exactly four times', (d) => {
    const config = ws.CONFIG[d];
    const tubes = ws.generateLevel(config, seeded(7));
    expect(tubes).toHaveLength(config.colors + config.empty);
    const counts = new Map<number, number>();
    tubes.flat().forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
    expect(counts.size).toBe(config.colors);
    counts.forEach((n) => expect(n).toBe(ws.CAPACITY));
    expect(tubes.filter((t) => t.length === 0)).toHaveLength(config.empty);
    expect(ws.isSolved(tubes)).toBe(false);
    expect(ws.solve(tubes)).not.toBeNull();
  });

  it('keeps generated levels solvable across many seeds', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const tubes = ws.generateLevel(ws.CONFIG.hard, seeded(seed));
      expect(ws.solve(tubes)).not.toBeNull();
    }
  });
});

describe('watersort game', () => {
  const setup = (difficulty: 'easy' | 'normal' | 'hard', seed: number) => {
    const finish = vi.fn();
    const scores: number[] = [];
    const sounds: string[] = [];
    const game = createGame();
    game.init({
      ctx: {} as CanvasRenderingContext2D,
      width: WIDTH,
      height: HEIGHT,
      difficulty,
      input: { isDown: () => false, wasPressed: () => false },
      audio: { play: (n) => sounds.push(n) },
      random: seeded(seed),
      setScore: (s) => scores.push(s),
      finish,
    });
    const level = ws.generateLevel(ws.CONFIG[difficulty], seeded(seed));
    const tap = (index: number) => {
      const s = layout(level.length)[index];
      game.onPointer!({ type: 'down', x: s.x, y: s.y + 30, button: 'primary', pointerType: 'touch' });
      game.onPointer!({ type: 'up', x: s.x, y: s.y + 30, button: 'primary', pointerType: 'touch' });
      game.update(1);
    };
    return { game, level, tap, finish, scores, sounds };
  };

  it('plays a full level by tapping and reports the move count', () => {
    const { game, level, tap, finish, scores } = setup('normal', 11);
    const path = ws.solve(level)!;
    for (const [a, b] of path) {
      tap(a);
      tap(b);
    }
    expect(scores.at(-1)).toBe(path.length);
    for (let i = 0; i < 5; i++) game.update(1);
    expect(finish).toHaveBeenCalledWith({ score: path.length, completed: true, headline: 'SORTED!' });
  });

  it('undoes a pour and charges extra moves for the bonus tube', () => {
    const { game, level, tap, scores, sounds } = setup('hard', 5);
    const [a, b] = ws.solve(level)![0];
    tap(a);
    tap(b);
    expect(scores.at(-1)).toBe(1);
    expect(game.onKey!('u')).toBe(true);
    expect(scores.at(-1)).toBe(0);
    game.onKey!('t');
    expect(scores.at(-1)).toBe(ws.EXTRA_PENALTY);
    sounds.length = 0;
    game.onKey!('t');
    expect(sounds).toEqual(['flag']);
  });

  it('refuses to pick up an empty tube', () => {
    const { level, tap, sounds } = setup('easy', 3);
    tap(level.length - 1);
    expect(sounds).toEqual(['flag']);
  });

  it('lays out tubes in two centred rows', () => {
    const slots = layout(14);
    expect(slots.filter((s) => s.y === slots[0].y)).toHaveLength(7);
    expect(slots[0].x + slots[6].x).toBe(WIDTH);
    const odd = layout(11);
    expect(odd.filter((s) => s.y === odd[0].y)).toHaveLength(6);
    expect(Math.min(...odd.map((s) => s.x - s.w / 2))).toBeGreaterThanOrEqual(0);
  });
});
