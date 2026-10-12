import type { Difficulty } from '../../types/game';

export const N = 15;
export const BLACK = 1;
export const WHITE = 2;

export type Cell = 0 | 1 | 2;
export type Board = Cell[];

export const AI: Record<Difficulty, { attack: number; defense: number; pickFrom: number }> = {
  easy: { attack: 1, defense: 0.55, pickFrom: 4 },
  normal: { attack: 1, defense: 0.9, pickFrom: 1 },
  hard: { attack: 1.1, defense: 1, pickFrom: 1 },
};

const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export const other = (who: Cell): Cell => (who === BLACK ? WHITE : BLACK);

export function createBoard(): Board {
  return new Array<Cell>(N * N).fill(0);
}

const inside = (r: number, c: number) => r >= 0 && r < N && c >= 0 && c < N;

export function runThrough(board: Board, idx: number, who: Cell, dr: number, dc: number): { cells: number[]; open: number } {
  const r0 = Math.floor(idx / N);
  const c0 = idx % N;
  const cells = [idx];
  let open = 0;
  for (const sign of [1, -1]) {
    let r = r0 + dr * sign;
    let c = c0 + dc * sign;
    while (inside(r, c) && board[r * N + c] === who) {
      cells.push(r * N + c);
      r += dr * sign;
      c += dc * sign;
    }
    if (inside(r, c) && board[r * N + c] === 0) open++;
  }
  return { cells, open };
}

export function fiveAt(board: Board, idx: number): number[] | null {
  const who = board[idx];
  if (!who) return null;
  for (const [dr, dc] of DIRS) {
    const { cells } = runThrough(board, idx, who, dr, dc);
    if (cells.length >= 5) return cells;
  }
  return null;
}

export function patternScore(count: number, open: number): number {
  if (count >= 5) return 1_000_000;
  if (open === 0) return 0;
  if (count === 4) return open === 2 ? 100_000 : 10_000;
  if (count === 3) return open === 2 ? 5_000 : 500;
  if (count === 2) return open === 2 ? 300 : 40;
  return open === 2 ? 10 : 2;
}

export function pointScore(board: Board, idx: number, who: Cell): number {
  let total = 0;
  for (const [dr, dc] of DIRS) {
    const { cells, open } = runThrough(board, idx, who, dr, dc);
    total += patternScore(cells.length, open);
  }
  return total;
}

export function candidates(board: Board): number[] {
  const out: number[] = [];
  let any = false;
  for (let i = 0; i < N * N; i++) {
    if (board[i]) {
      any = true;
      continue;
    }
    const r = Math.floor(i / N);
    const c = i % N;
    let near = false;
    for (let dr = -2; dr <= 2 && !near; dr++) {
      for (let dc = -2; dc <= 2 && !near; dc++) {
        if (inside(r + dr, c + dc) && board[(r + dr) * N + c + dc]) near = true;
      }
    }
    if (near) out.push(i);
  }
  return any ? out : [Math.floor(N / 2) * N + Math.floor(N / 2)];
}

export function rankMoves(board: Board, me: Cell, difficulty: Difficulty): { idx: number; score: number }[] {
  const { attack, defense } = AI[difficulty];
  const opp = other(me);
  const center = (N - 1) / 2;
  return candidates(board)
    .map((idx) => {
      const r = Math.floor(idx / N);
      const c = idx % N;
      const centrality = 8 - Math.max(Math.abs(r - center), Math.abs(c - center));
      return { idx, score: pointScore(board, idx, me) * attack + pointScore(board, idx, opp) * defense + centrality };
    })
    .sort((a, b) => b.score - a.score);
}

export function chooseMove(board: Board, me: Cell, difficulty: Difficulty, random: () => number): number {
  const ranked = rankMoves(board, me, difficulty);
  if (!ranked.length) return -1;
  const { pickFrom } = AI[difficulty];
  if (ranked[0].score >= 100_000 || pickFrom <= 1) return ranked[0].idx;
  const pool = ranked.slice(0, pickFrom);
  return pool[Math.floor(random() * pool.length)].idx;
}

export function isFull(board: Board): boolean {
  return board.every((c) => c !== 0);
}

export function winScore(playerMoves: number): number {
  return Math.max(100, 1000 - 10 * (playerMoves - 5));
}
