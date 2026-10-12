import { clear, COLORS, drawDisc, drawText } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import { BLACK, type Board, chooseMove, count, createBoard, isOver, legalMoves, N, play, WHITE } from './logic';

export const WIDTH = 240;
export const HEIGHT = 284;
export const CELL = 28;
export const BOARD_X = 8;
export const BOARD_Y = 34;
const CPU_DELAY = 0.55;
const FLIP_TIME = 0.28;
const END_DELAY = 1.6;

type Phase = 'player' | 'cpu' | 'over';

export function createGame(): Game {
  let ctx!: GameContext;
  let board: Board = createBoard();
  let phase: Phase = 'player';
  let cpuTimer = 0;
  let flipping = new Map<number, number>();
  let lastMove = -1;
  let cursor = 19;
  let showCursor = false;
  let message = '';
  let messageTimer = 0;
  let endTimer = -1;
  let finished = false;
  let time = 0;

  const say = (text: string, duration = 1.4) => {
    message = text;
    messageTimer = duration;
  };

  const finalScore = () => {
    const { black, white } = count(board);
    return black > white ? black : 0;
  };

  const advance = (justMoved: 1 | 2) => {
    if (isOver(board)) {
      phase = 'over';
      const { black, white } = count(board);
      say(black > white ? 'YOU WIN' : black < white ? 'CPU WINS' : 'DRAW', 99);
      ctx.audio.play(black > white ? 'clear' : black < white ? 'die' : 'select');
      endTimer = END_DELAY;
      return;
    }
    const next = justMoved === BLACK ? WHITE : BLACK;
    if (legalMoves(board, next).length) {
      phase = next === BLACK ? 'player' : 'cpu';
    } else {
      phase = justMoved === BLACK ? 'player' : 'cpu';
      say(next === BLACK ? 'YOU PASS' : 'CPU PASSES');
      ctx.audio.play('reveal');
    }
    if (phase === 'cpu') cpuTimer = CPU_DELAY;
  };

  const move = (idx: number, who: 1 | 2) => {
    const flips = play(board, idx, who);
    if (!flips.length) return false;
    lastMove = idx;
    flips.forEach((f) => flipping.set(f, FLIP_TIME));
    ctx.audio.play(who === BLACK ? 'flag' : 'reveal');
    ctx.setScore(count(board).black);
    advance(who);
    return true;
  };

  const playerMove = (idx: number) => {
    if (phase !== 'player') return;
    if (!move(idx, BLACK)) ctx.audio.play('die');
  };

  return {
    init(context) {
      ctx = context;
      board = createBoard();
      phase = 'player';
      flipping = new Map();
      lastMove = -1;
      cursor = 19;
      showCursor = false;
      message = 'YOUR TURN';
      messageTimer = 1.2;
      endTimer = -1;
      finished = false;
      time = 0;
    },

    update(dt) {
      time += dt;
      if (messageTimer > 0 && messageTimer < 90) messageTimer -= dt;
      for (const [k, v] of flipping) {
        if (v - dt <= 0) flipping.delete(k);
        else flipping.set(k, v - dt);
      }
      if (endTimer >= 0) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          const { black, white } = count(board);
          ctx.finish({ score: finalScore(), completed: true, headline: black > white ? 'YOU WIN!' : black === white ? 'DRAW' : 'GAME OVER' });
        }
        return;
      }
      if (phase === 'cpu') {
        cpuTimer -= dt;
        if (cpuTimer <= 0) {
          const m = chooseMove(board, WHITE, ctx.difficulty, ctx.random);
          if (m >= 0) move(m, WHITE);
          else advance(WHITE);
        }
        return;
      }
      if (phase !== 'player') return;
      const { input } = ctx;
      const dirs: [Parameters<typeof input.wasPressed>[0], number, number][] = [
        ['left', -1, 0],
        ['right', 1, 0],
        ['up', 0, -1],
        ['down', 0, 1],
      ];
      for (const [a, dx, dy] of dirs) {
        if (!input.wasPressed(a)) continue;
        showCursor = true;
        const x = Math.min(N - 1, Math.max(0, (cursor % N) + dx));
        const y = Math.min(N - 1, Math.max(0, Math.floor(cursor / N) + dy));
        cursor = y * N + x;
      }
      if (input.wasPressed('primary')) {
        showCursor = true;
        playerMove(cursor);
      }
    },

    onPointer(e: PointerInfo) {
      if (e.type !== 'down') return;
      const c = Math.floor((e.x - BOARD_X) / CELL);
      const r = Math.floor((e.y - BOARD_Y) / CELL);
      if (c < 0 || r < 0 || c >= N || r >= N) return;
      showCursor = false;
      cursor = r * N + c;
      playerMove(cursor);
    },

    render() {
      const g = ctx.ctx;
      clear(g, WIDTH, HEIGHT);
      const { black, white } = count(board);
      drawDisc(g, 16, 14, 7, '#6a6a8a');
      drawDisc(g, 16, 14, 6, '#141420');
      drawText(g, `YOU ${black}`, 26, 10, { color: phase === 'player' ? COLORS.cyan : COLORS.text });
      drawDisc(g, WIDTH - 16, 14, 6, '#f0f0f0');
      drawText(g, `${white} CPU`, WIDTH - 26, 10, { color: phase === 'cpu' ? COLORS.cyan : COLORS.text, align: 'right' });

      g.fillStyle = '#1d6b45';
      g.fillRect(BOARD_X - 3, BOARD_Y - 3, N * CELL + 6, N * CELL + 6);
      g.fillStyle = '#2a8a5a';
      g.fillRect(BOARD_X, BOARD_Y, N * CELL, N * CELL);
      g.fillStyle = '#1d6b45';
      for (let k = 1; k < N; k++) {
        g.fillRect(BOARD_X + k * CELL, BOARD_Y, 1, N * CELL);
        g.fillRect(BOARD_X, BOARD_Y + k * CELL, N * CELL, 1);
      }
      for (const [x, y] of [[2, 2], [6, 2], [2, 6], [6, 6]]) g.fillRect(BOARD_X + x * CELL - 2, BOARD_Y + y * CELL - 2, 4, 4);

      const hints = phase === 'player' ? new Set(legalMoves(board, BLACK)) : new Set<number>();
      for (let i = 0; i < N * N; i++) {
        const cx = BOARD_X + (i % N) * CELL + CELL / 2;
        const cy = BOARD_Y + Math.floor(i / N) * CELL + CELL / 2;
        const who = board[i];
        if (who) {
          const flip = flipping.get(i);
          const shown = flip !== undefined && flip > FLIP_TIME / 2 ? (who === BLACK ? WHITE : BLACK) : who;
          const squash = flip !== undefined ? Math.abs(flip / FLIP_TIME - 0.5) * 2 : 1;
          const r = 11;
          drawDisc(g, cx + 1, cy + 1, r, '#0f4a2e');
          if (squash >= 0.98) drawDisc(g, cx, cy, r, shown === BLACK ? '#141420' : '#f0f0f0');
          else {
            const w = Math.max(2, Math.round(r * 2 * squash));
            g.fillStyle = shown === BLACK ? '#141420' : '#f0f0f0';
            g.fillRect(cx - w / 2, cy - r + 2, w, r * 2 - 4);
          }
          if (i === lastMove) {
            g.fillStyle = COLORS.red;
            g.fillRect(cx - 1, cy - 1, 3, 3);
          }
        } else if (hints.has(i)) {
          g.fillStyle = '#5ab884';
          g.fillRect(cx - 2, cy - 2, 4, 4);
        }
      }
      if (showCursor && phase === 'player') {
        g.strokeStyle = COLORS.gold;
        g.lineWidth = 2;
        g.strokeRect(BOARD_X + (cursor % N) * CELL + 1, BOARD_Y + Math.floor(cursor / N) * CELL + 1, CELL - 2, CELL - 2);
      }
      const text = messageTimer > 0 ? message : phase === 'player' ? 'YOUR TURN' : phase === 'cpu' ? 'CPU...' : message;
      const color = text === 'YOU WIN' ? COLORS.cyan : text === 'CPU WINS' ? COLORS.red : text.includes('PASS') ? COLORS.gold : COLORS.text;
      drawText(g, text, WIDTH / 2, HEIGHT - 20, { color, align: 'center' });
    },

    destroy() {
      return;
    },
  };
}
