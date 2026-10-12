import { clear, COLORS, drawDisc, drawText } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import { BLACK, type Board, chooseMove, createBoard, fiveAt, isFull, N, WHITE, winScore } from './logic';

export const WIDTH = 240;
export const HEIGHT = 294;
export const GAP = 15;
export const BOARD_X = 15;
export const BOARD_Y = 36;
const CPU_DELAY = 0.45;
const END_DELAY = 2;
const STARS = [
  [3, 3],
  [11, 3],
  [7, 7],
  [3, 11],
  [11, 11],
];

type Phase = 'player' | 'cpu' | 'over';

export function createGame(): Game {
  let ctx!: GameContext;
  let board: Board = createBoard();
  let phase: Phase = 'player';
  let cpuTimer = 0;
  let cursor = 7 * N + 7;
  let preview = -1;
  let touchStart = -1;
  let showCursor = false;
  let lastMove = -1;
  let winLine: number[] = [];
  let playerMoves = 0;
  let won = false;
  let message = 'YOUR TURN';
  let endTimer = -1;
  let finished = false;
  let time = 0;

  const px = (i: number) => BOARD_X + (i % N) * GAP;
  const py = (i: number) => BOARD_Y + Math.floor(i / N) * GAP;

  const place = (idx: number, who: 1 | 2) => {
    board[idx] = who;
    lastMove = idx;
    ctx.audio.play(who === BLACK ? 'lock' : 'reveal');
    const five = fiveAt(board, idx);
    if (five) {
      winLine = five;
      phase = 'over';
      won = who === BLACK;
      message = won ? 'YOU WIN' : 'NPC WINS';
      ctx.audio.play(won ? 'clear' : 'die');
      if (won) ctx.setScore(winScore(playerMoves));
      endTimer = END_DELAY;
      return;
    }
    if (isFull(board)) {
      phase = 'over';
      message = 'DRAW';
      endTimer = END_DELAY;
      return;
    }
    phase = who === BLACK ? 'cpu' : 'player';
    message = phase === 'cpu' ? 'NPC...' : 'YOUR TURN';
    cpuTimer = CPU_DELAY;
  };

  const playerPlace = (idx: number) => {
    if (phase !== 'player' || board[idx]) return;
    playerMoves++;
    preview = -1;
    place(idx, BLACK);
  };

  const nearest = (x: number, y: number) => {
    const c = Math.round((x - BOARD_X) / GAP);
    const r = Math.round((y - BOARD_Y) / GAP);
    return r >= 0 && r < N && c >= 0 && c < N ? r * N + c : -1;
  };

  return {
    init(context) {
      ctx = context;
      board = createBoard();
      phase = 'player';
      cursor = 7 * N + 7;
      preview = -1;
      showCursor = false;
      lastMove = -1;
      winLine = [];
      playerMoves = 0;
      won = false;
      message = 'YOUR TURN';
      endTimer = -1;
      finished = false;
      time = 0;
    },

    update(dt) {
      time += dt;
      if (endTimer >= 0) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          ctx.finish({ score: won ? winScore(playerMoves) : 0, completed: true, headline: won ? 'YOU WIN!' : message === 'DRAW' ? 'DRAW' : 'GAME OVER' });
        }
        return;
      }
      if (phase === 'cpu') {
        cpuTimer -= dt;
        if (cpuTimer <= 0) {
          const m = chooseMove(board, WHITE, ctx.difficulty, ctx.random);
          if (m >= 0) place(m, WHITE);
        }
        return;
      }
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
        ctx.audio.play('move');
      }
      if (input.wasPressed('primary')) {
        showCursor = true;
        playerPlace(cursor);
      }
    },

    onPointer(e: PointerInfo) {
      const idx = nearest(e.x, e.y);
      if (e.pointerType === 'mouse') {
        if (e.type === 'move') {
          showCursor = idx >= 0;
          if (idx >= 0) cursor = idx;
        }
        if (e.type === 'down' && idx >= 0) {
          cursor = idx;
          playerPlace(idx);
        }
        return;
      }
      if (e.type === 'down') {
        touchStart = idx;
        return;
      }
      if (e.type !== 'up') return;
      const started = touchStart;
      touchStart = -1;
      if (idx < 0 || idx !== started || phase !== 'player' || board[idx]) return;
      if (preview === idx) playerPlace(idx);
      else {
        preview = idx;
        cursor = idx;
        showCursor = true;
        ctx.audio.play('move');
      }
    },

    render() {
      const g = ctx.ctx;
      clear(g, WIDTH, HEIGHT);
      drawDisc(g, 14, 14, 6, '#6a6a8a');
      drawDisc(g, 14, 14, 5, '#141420');
      drawText(g, 'YOU', 24, 10, { color: phase === 'player' ? COLORS.cyan : COLORS.text });
      drawDisc(g, WIDTH - 14, 14, 5, '#f0f0f0');
      drawText(g, 'NPC', WIDTH - 24, 10, { color: phase === 'cpu' ? COLORS.cyan : COLORS.text, align: 'right' });

      g.fillStyle = '#c8964e';
      g.fillRect(BOARD_X - 11, BOARD_Y - 11, (N - 1) * GAP + 22, (N - 1) * GAP + 22);
      g.fillStyle = '#6a4420';
      for (let k = 0; k < N; k++) {
        g.fillRect(BOARD_X + k * GAP, BOARD_Y, 1, (N - 1) * GAP + 1);
        g.fillRect(BOARD_X, BOARD_Y + k * GAP, (N - 1) * GAP + 1, 1);
      }
      for (const [c, r] of STARS) g.fillRect(BOARD_X + c * GAP - 1, BOARD_Y + r * GAP - 1, 3, 3);

      const flash = Math.floor(time * 6) % 2 === 0;
      for (let i = 0; i < N * N; i++) {
        const who = board[i];
        if (!who) continue;
        const x = px(i) + 1;
        const y = py(i) + 1;
        drawDisc(g, x + 1, y + 1, 6, '#7a5428');
        const lit = winLine.includes(i) && flash;
        drawDisc(g, x, y, 6, lit ? COLORS.gold : who === BLACK ? '#141420' : '#f4f4f4');
        if (who === BLACK && !lit) {
          g.fillStyle = '#4a4a60';
          g.fillRect(x - 3, y - 4, 2, 2);
        }
        if (i === lastMove) {
          g.fillStyle = COLORS.red;
          g.fillRect(x - 1, y - 1, 2, 2);
        }
      }

      if (showCursor && phase === 'player' && !board[cursor]) {
        const x = px(cursor) + 1;
        const y = py(cursor) + 1;
        if (preview === cursor) {
          g.globalAlpha = 0.55;
          drawDisc(g, x, y, 6, '#141420');
          g.globalAlpha = 1;
        }
        g.fillStyle = COLORS.pink;
        g.fillRect(x - 7, y - 7, 4, 1);
        g.fillRect(x - 7, y - 7, 1, 4);
        g.fillRect(x + 3, y - 7, 4, 1);
        g.fillRect(x + 6, y - 7, 1, 4);
        g.fillRect(x - 7, y + 6, 4, 1);
        g.fillRect(x - 7, y + 3, 1, 4);
        g.fillRect(x + 3, y + 6, 4, 1);
        g.fillRect(x + 6, y + 3, 1, 4);
      }

      const text = preview >= 0 && phase === 'player' ? 'TAP AGAIN TO PLACE' : message;
      const color = message === 'YOU WIN' ? COLORS.cyan : message === 'NPC WINS' ? COLORS.red : COLORS.text;
      drawText(g, text, WIDTH / 2, HEIGHT - 18, { color, align: 'center' });
    },

    destroy() {
      return;
    },
  };
}
