import type { Difficulty } from '../../types/game';

export const COLS = 7;
export const ROWS = 6;
export const ROUNDS = 3;
export const WIN_POINTS = 100;
export const DRAW_POINTS = 40;
export const PLAYER = 1;
export const CPU = 2;

export type Cell = 0 | 1 | 2;
export type Board = Cell[];

export const AI: Record<Difficulty, { depth: number; blunder: number }> = {
  easy: { depth: 2, blunder: 0.3 },
  normal: { depth: 4, blunder: 0.05 },
  hard: { depth: 6, blunder: 0 },
};

const ORDER = [3, 2, 4, 1, 5, 0, 6];
const WIN_SCORE = 1_000_000;

export const index = (row: number, col: number) => row * COLS + col;

export function createBoard(): Board {
  return new Array<Cell>(ROWS * COLS).fill(0);
}

export function dropRow(board: Board, col: number): number {
  if (col < 0 || col >= COLS) return -1;
  for (let r = ROWS - 1; r >= 0; r--) if (board[index(r, col)] === 0) return r;
  return -1;
}

export function validColumns(board: Board): number[] {
  return ORDER.filter((c) => board[index(0, c)] === 0);
}

export function drop(board: Board, col: number, who: Cell): number {
  const row = dropRow(board, col);
  if (row >= 0) board[index(row, col)] = who;
  return row;
}

const LINES: number[][] = (() => {
  const lines: number[][] = [];
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of dirs) {
        const er = r + dr * 3;
        const ec = c + dc * 3;
        if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue;
        lines.push([0, 1, 2, 3].map((k) => index(r + dr * k, c + dc * k)));
      }
    }
  }
  return lines;
})();

export function findWin(board: Board): { who: Cell; cells: number[] } | null {
  for (const line of LINES) {
    const who = board[line[0]];
    if (who && line.every((i) => board[i] === who)) return { who, cells: line };
  }
  return null;
}

export function isFull(board: Board): boolean {
  return validColumns(board).length === 0;
}

export function evaluate(board: Board, me: Cell): number {
  const opp: Cell = me === PLAYER ? CPU : PLAYER;
  let score = 0;
  for (let r = 0; r < ROWS; r++) {
    if (board[index(r, 3)] === me) score += 3;
    else if (board[index(r, 3)] === opp) score -= 3;
  }
  for (const line of LINES) {
    let mine = 0;
    let theirs = 0;
    for (const i of line) {
      if (board[i] === me) mine++;
      else if (board[i] === opp) theirs++;
    }
    if (mine && theirs) continue;
    if (mine === 3) score += 5;
    else if (mine === 2) score += 2;
    if (theirs === 3) score -= 6;
    else if (theirs === 2) score -= 2;
  }
  return score;
}

function negamax(board: Board, depth: number, alpha: number, beta: number, me: Cell): number {
  const opp: Cell = me === PLAYER ? CPU : PLAYER;
  const cols = validColumns(board);
  if (!cols.length) return 0;
  if (depth === 0) return evaluate(board, me);
  let best = -Infinity;
  for (const c of cols) {
    const r = drop(board, c, me);
    const score = findWin(board) ? WIN_SCORE + depth : -negamax(board, depth - 1, -beta, -alpha, opp);
    board[index(r, c)] = 0;
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function bestColumn(board: Board, me: Cell, depth: number): number {
  const opp: Cell = me === PLAYER ? CPU : PLAYER;
  let best = -Infinity;
  let move = validColumns(board)[0] ?? -1;
  for (const c of validColumns(board)) {
    const r = drop(board, c, me);
    const score = findWin(board) ? WIN_SCORE + depth : -negamax(board, depth - 1, -Infinity, Infinity, opp);
    board[index(r, c)] = 0;
    if (score > best) {
      best = score;
      move = c;
    }
  }
  return move;
}

export function chooseColumn(board: Board, me: Cell, difficulty: Difficulty, random: () => number): number {
  const cols = validColumns(board);
  if (!cols.length) return -1;
  const { depth, blunder } = AI[difficulty];
  if (random() < blunder) return cols[Math.floor(random() * cols.length)];
  return bestColumn(board.slice(), me, depth);
}

export function seriesScore(wins: number, draws: number): number {
  return wins * WIN_POINTS + draws * DRAW_POINTS;
}
