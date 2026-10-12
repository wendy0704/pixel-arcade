import type { Difficulty } from '../../types/game';

export const MAZE = [
  '###################',
  '#o.......#.......o#',
  '#.##.###.#.###.##.#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.### # ###.####',
  'xxx#.#       #.#xxx',
  '####.# ##-## #.####',
  '    .  #GGG#  .    ',
  '####.# ##### #.####',
  'xxx#.#       #.#xxx',
  '####.# ##### #.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#.....P.....#.o#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################',
];

export const COLS = 19;
export const ROWS = 21;
export const TILE = 12;
export const HUD = 18;
export const WIDTH = COLS * TILE;
export const HEIGHT = ROWS * TILE + HUD + 6;
export const DOOR = { x: 9, y: 8 };
export const EXIT = { x: 9, y: 7 };
export const PEN = [
  { x: 9, y: 9 },
  { x: 8, y: 9 },
  { x: 10, y: 9 },
  { x: 9, y: 9 },
];
export const DOT_POINTS = 10;
export const POWER_POINTS = 50;
export const LIVES = 3;
export const PLAYER_SPEED = 6.5;
export const EYES_SPEED = 12;
export const RELEASE_TIMES = [0, 3, 7, 11];
export const MODE_SCHEDULE: [Mode, number][] = [
  ['scatter', 6],
  ['chase', 20],
  ['scatter', 5],
  ['chase', 20],
  ['scatter', 4],
  ['chase', Infinity],
];

export const CONFIG: Record<Difficulty, { enemySpeed: number; fright: number }> = {
  easy: { enemySpeed: 4.8, fright: 8 },
  normal: { enemySpeed: 5.6, fright: 6 },
  hard: { enemySpeed: 6.3, fright: 4.5 },
};

export type Mode = 'scatter' | 'chase';
export type Dir = 'up' | 'left' | 'down' | 'right';
export type Persona = 'stalker' | 'ambusher' | 'wanderer' | 'shy';

export const PERSONAS: Persona[] = ['stalker', 'ambusher', 'wanderer', 'shy'];
export const CORNERS: Record<Persona, Point> = {
  stalker: { x: COLS - 2, y: -2 },
  ambusher: { x: 1, y: -2 },
  wanderer: { x: COLS - 1, y: ROWS + 1 },
  shy: { x: 0, y: ROWS + 1 },
};

export const DIRS: Dir[] = ['up', 'left', 'down', 'right'];
export const DELTA: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  down: { x: 0, y: 1 },
  right: { x: 1, y: 0 },
};
export const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export interface Point {
  x: number;
  y: number;
}

export function cellAt(x: number, y: number): string {
  if (y < 0 || y >= ROWS) return '#';
  return MAZE[y][((x % COLS) + COLS) % COLS];
}

export function passable(x: number, y: number, throughDoor = false): boolean {
  const c = cellAt(x, y);
  if (c === '#' || c === 'x') return false;
  if (c === '-' || c === 'G') return throughDoor;
  return true;
}

export function step(p: Point, dir: Dir): Point {
  const d = DELTA[dir];
  return { x: (((p.x + d.x) % COLS) + COLS) % COLS, y: p.y + d.y };
}

export function startPoint(): Point {
  for (let y = 0; y < ROWS; y++) {
    const x = MAZE[y].indexOf('P');
    if (x >= 0) return { x, y };
  }
  throw new Error('maze has no start');
}

export function createDots(): Map<number, 'dot' | 'power'> {
  const dots = new Map<number, 'dot' | 'power'>();
  MAZE.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === '.') dots.set(y * COLS + x, 'dot');
      if (c === 'o') dots.set(y * COLS + x, 'power');
    }),
  );
  return dots;
}

export function distance2(a: Point, b: Point): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

export function options(at: Point, current: Dir | null, throughDoor = false): Dir[] {
  const open = DIRS.filter((d) => {
    const n = step(at, d);
    return passable(n.x, n.y, throughDoor);
  });
  if (!current) return open;
  const forward = open.filter((d) => d !== OPPOSITE[current]);
  return forward.length ? forward : open;
}

export function chooseToward(at: Point, current: Dir | null, target: Point, throughDoor = false): Dir | null {
  const opts = options(at, current, throughDoor);
  let best: Dir | null = null;
  let bestD = Infinity;
  for (const d of opts) {
    const dist = distance2(step(at, d), target);
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best;
}

export function chaseTarget(persona: Persona, enemyAt: Point, player: Point, playerDir: Dir, wanderTarget: Point): Point {
  if (persona === 'stalker') return player;
  if (persona === 'ambusher') {
    const d = DELTA[playerDir];
    return { x: player.x + d.x * 3, y: player.y + d.y * 3 };
  }
  if (persona === 'wanderer') return wanderTarget;
  return distance2(enemyAt, player) > 49 ? player : CORNERS.shy;
}

export function modeAt(elapsed: number): Mode {
  let t = elapsed;
  for (const [mode, dur] of MODE_SCHEDULE) {
    if (t < dur) return mode;
    t -= dur;
  }
  return 'chase';
}

export function frightTime(difficulty: Difficulty, level: number): number {
  return Math.max(2, CONFIG[difficulty].fright - (level - 1) * 0.5);
}

export function enemySpeed(difficulty: Difficulty, level: number): number {
  return CONFIG[difficulty].enemySpeed * Math.min(1.25, 1 + (level - 1) * 0.05);
}

export function chainPoints(chain: number): number {
  return 200 * 2 ** Math.min(3, chain);
}

export function reachable(from: Point): Set<number> {
  const seen = new Set<number>([from.y * COLS + from.x]);
  const queue = [from];
  while (queue.length) {
    const p = queue.shift()!;
    for (const d of DIRS) {
      const n = step(p, d);
      const key = n.y * COLS + n.x;
      if (!seen.has(key) && passable(n.x, n.y)) {
        seen.add(key);
        queue.push(n);
      }
    }
  }
  return seen;
}
