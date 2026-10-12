import type { Difficulty } from '../../types/game';

export const N = 8;
export const BLACK = 1;
export const WHITE = 2;

export type Cell = 0 | 1 | 2;
export type Board = Cell[];

export const WEIGHTS = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
];

export const AI: Record<Difficulty, { depth: number; noise: number }> = {
  easy: { depth: 1, noise: 60 },
  normal: { depth: 2, noise: 8 },
  hard: { depth: 4, noise: 0 },
};

const DIRS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export const other = (who: Cell): Cell => (who === BLACK ? WHITE : BLACK);

export function createBoard(): Board {
  const b = new Array<Cell>(N * N).fill(0);
  b[3 * N + 3] = WHITE;
  b[4 * N + 4] = WHITE;
  b[3 * N + 4] = BLACK;
  b[4 * N + 3] = BLACK;
  return b;
}

export function flipsFor(board: Board, idx: number, who: Cell): number[] {
  if (board[idx] !== 0) return [];
  const r0 = Math.floor(idx / N);
  const c0 = idx % N;
  const opp = other(who);
  const flips: number[] = [];
  for (const [dr, dc] of DIRS) {
    const line: number[] = [];
    let r = r0 + dr;
    let c = c0 + dc;
    while (r >= 0 && r < N && c >= 0 && c < N && board[r * N + c] === opp) {
      line.push(r * N + c);
      r += dr;
      c += dc;
    }
    if (line.length && r >= 0 && r < N && c >= 0 && c < N && board[r * N + c] === who) flips.push(...line);
  }
  return flips;
}

export function legalMoves(board: Board, who: Cell): number[] {
  const moves: number[] = [];
  for (let i = 0; i < N * N; i++) if (board[i] === 0 && flipsFor(board, i, who).length) moves.push(i);
  return moves;
}

export function play(board: Board, idx: number, who: Cell): number[] {
  const flips = flipsFor(board, idx, who);
  if (!flips.length) return [];
  board[idx] = who;
  for (const f of flips) board[f] = who;
  return flips;
}

export function count(board: Board): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (const c of board) {
    if (c === BLACK) black++;
    else if (c === WHITE) white++;
  }
  return { black, white };
}

export function isOver(board: Board): boolean {
  return !legalMoves(board, BLACK).length && !legalMoves(board, WHITE).length;
}

export function evaluate(board: Board, me: Cell): number {
  const opp = other(me);
  if (isOver(board)) {
    const { black, white } = count(board);
    const diff = me === BLACK ? black - white : white - black;
    return diff * 1000;
  }
  let score = 0;
  for (let i = 0; i < N * N; i++) {
    if (board[i] === me) score += WEIGHTS[i];
    else if (board[i] === opp) score -= WEIGHTS[i];
  }
  score += (legalMoves(board, me).length - legalMoves(board, opp).length) * 5;
  return score;
}

function search(board: Board, depth: number, alpha: number, beta: number, toMove: Cell, me: Cell): number {
  if (depth === 0 || isOver(board)) return evaluate(board, me);
  const moves = legalMoves(board, toMove);
  if (!moves.length) return search(board, depth, alpha, beta, other(toMove), me);
  const maximizing = toMove === me;
  let best = maximizing ? -Infinity : Infinity;
  for (const m of moves) {
    const next = board.slice();
    play(next, m, toMove);
    const v = search(next, depth - 1, alpha, beta, other(toMove), me);
    if (maximizing) {
      best = Math.max(best, v);
      alpha = Math.max(alpha, v);
    } else {
      best = Math.min(best, v);
      beta = Math.min(beta, v);
    }
    if (alpha >= beta) break;
  }
  return best;
}

export function chooseMove(board: Board, me: Cell, difficulty: Difficulty, random: () => number): number {
  const moves = legalMoves(board, me);
  if (!moves.length) return -1;
  const { depth, noise } = AI[difficulty];
  let best = -Infinity;
  let move = moves[0];
  for (const m of moves) {
    const next = board.slice();
    play(next, m, me);
    const v = search(next, depth - 1, -Infinity, Infinity, other(me), me) + (random() - 0.5) * noise * 2;
    if (v > best) {
      best = v;
      move = m;
    }
  }
  return move;
}
