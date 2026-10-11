import type { Difficulty } from '../../types/game';

export type Mark = 'X' | 'O';
export type Cell = Mark | null;

export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const SKILL: Record<Difficulty, number> = { easy: 0.35, normal: 0.75, hard: 1 };
export const ROUNDS = 5;
export const WIN_POINTS = 100;
export const DRAW_POINTS = 40;

export function createBoard(): Cell[] {
  return Array<Cell>(9).fill(null);
}

export function winner(board: Cell[]): { mark: Mark; line: number[] } | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    const m = board[a];
    if (m && m === board[b] && m === board[c]) return { mark: m, line };
  }
  return null;
}

export function isDraw(board: Cell[]): boolean {
  return !winner(board) && board.every((c) => c !== null);
}

export function emptyIndices(board: Cell[]): number[] {
  return board.flatMap((c, i) => (c === null ? [i] : []));
}

const other = (m: Mark): Mark => (m === 'X' ? 'O' : 'X');

export function minimax(board: Cell[], toMove: Mark, me: Mark, depth = 0): number {
  const w = winner(board);
  if (w) return w.mark === me ? 10 - depth : depth - 10;
  const empty = emptyIndices(board);
  if (!empty.length) return 0;
  const scores = empty.map((i) => {
    board[i] = toMove;
    const s = minimax(board, other(toMove), me, depth + 1);
    board[i] = null;
    return s;
  });
  return toMove === me ? Math.max(...scores) : Math.min(...scores);
}

export function bestMove(board: Cell[], me: Mark): number {
  if (board.every((c) => c === null)) return 4;
  let best = -Infinity;
  let move = -1;
  for (const i of emptyIndices(board)) {
    board[i] = me;
    const s = minimax(board, other(me), me, 1);
    board[i] = null;
    if (s > best) {
      best = s;
      move = i;
    }
  }
  return move;
}

export function chooseMove(board: Cell[], me: Mark, skill: number, random: () => number): number {
  const empty = emptyIndices(board);
  if (!empty.length) return -1;
  if (random() < skill) return bestMove(board, me);
  return empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))];
}

export function seriesScore(wins: number, draws: number): number {
  return wins * WIN_POINTS + draws * DRAW_POINTS;
}
