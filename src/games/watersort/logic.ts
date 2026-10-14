import type { Difficulty } from '../../types/game';

export const CAPACITY = 4;
export const EXTRA_PENALTY = 5;
const SEARCH_LIMIT = 200000;
const MAX_ATTEMPTS = 40;

export type Tube = number[];

export interface LevelConfig {
  colors: number;
  empty: number;
  undos: number;
}

export const CONFIG: Record<Difficulty, LevelConfig> = {
  easy: { colors: 6, empty: 2, undos: 99 },
  normal: { colors: 9, empty: 2, undos: 10 },
  hard: { colors: 12, empty: 2, undos: 5 },
};

export const top = (tube: Tube): number => (tube.length ? tube[tube.length - 1] : -1);

export function topRun(tube: Tube): number {
  if (!tube.length) return 0;
  const color = top(tube);
  let n = 0;
  for (let i = tube.length - 1; i >= 0 && tube[i] === color; i--) n++;
  return n;
}

export const isComplete = (tube: Tube): boolean => tube.length === CAPACITY && topRun(tube) === CAPACITY;

export function pourAmount(tubes: Tube[], from: number, to: number): number {
  if (from === to) return 0;
  const src = tubes[from];
  const dst = tubes[to];
  if (!src.length || dst.length >= CAPACITY || isComplete(src)) return 0;
  if (dst.length && top(dst) !== top(src)) return 0;
  return Math.min(topRun(src), CAPACITY - dst.length);
}

export const canPour = (tubes: Tube[], from: number, to: number): boolean => pourAmount(tubes, from, to) > 0;

export function pour(tubes: Tube[], from: number, to: number): number {
  const amount = pourAmount(tubes, from, to);
  for (let i = 0; i < amount; i++) tubes[to].push(tubes[from].pop()!);
  return amount;
}

export const isSolved = (tubes: Tube[]): boolean => tubes.every((t) => t.length === 0 || isComplete(t));

export const cloneTubes = (tubes: Tube[]): Tube[] => tubes.map((t) => t.slice());

function usefulMove(tubes: Tube[], from: number, to: number): boolean {
  if (!canPour(tubes, from, to)) return false;
  const src = tubes[from];
  if (!tubes[to].length && topRun(src) === src.length) return false;
  return true;
}

export function hasMoves(tubes: Tube[]): boolean {
  for (let a = 0; a < tubes.length; a++) {
    for (let b = 0; b < tubes.length; b++) if (usefulMove(tubes, a, b)) return true;
  }
  return false;
}

const keyOf = (tubes: Tube[]): string =>
  tubes
    .map((t) => t.join(','))
    .sort()
    .join('|');

export function solve(start: Tube[], limit = SEARCH_LIMIT): [number, number][] | null {
  const seen = new Set<string>();
  const path: [number, number][] = [];
  const tubes = cloneTubes(start);
  let visited = 0;
  const dfs = (): boolean => {
    if (isSolved(tubes)) return true;
    const key = keyOf(tubes);
    if (seen.has(key) || ++visited > limit) return false;
    seen.add(key);
    for (let a = 0; a < tubes.length; a++) {
      for (let b = 0; b < tubes.length; b++) {
        if (!usefulMove(tubes, a, b)) continue;
        const moved = pour(tubes, a, b);
        path.push([a, b]);
        if (dfs()) return true;
        path.pop();
        for (let i = 0; i < moved; i++) tubes[a].push(tubes[b].pop()!);
      }
    }
    return false;
  };
  return dfs() ? path : null;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function generateLevel(config: LevelConfig, random: () => number): Tube[] {
  let fallback: Tube[] = [];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const units = shuffle(
      Array.from({ length: config.colors * CAPACITY }, (_, i) => Math.floor(i / CAPACITY)),
      random,
    );
    const tubes: Tube[] = [];
    for (let c = 0; c < config.colors; c++) tubes.push(units.slice(c * CAPACITY, (c + 1) * CAPACITY));
    for (let e = 0; e < config.empty; e++) tubes.push([]);
    fallback = tubes;
    if (tubes.some((t) => topRun(t) >= 3)) continue;
    if (solve(tubes)) return tubes;
  }
  return fallback;
}
