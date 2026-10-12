import { clear, COLORS, drawText } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import { type Cell, chooseMove, createBoard, isDraw, ROUNDS, seriesScore, SKILL, winner } from './logic';
import { drawO, drawX } from './marks';

export const WIDTH = 240;
export const HEIGHT = 288;
const BOARD_X = 12;
const BOARD_Y = 40;
const CELL = 72;
const CPU_DELAY = 0.45;
const RESULT_DELAY = 1.4;

type Phase = 'player' | 'cpu' | 'result';

export function createGame(): Game {
  let ctx!: GameContext;
  let board: Cell[] = createBoard();
  let round = 1;
  let phase: Phase = 'player';
  let cpuTimer = 0;
  let resultTimer = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let message = '';
  let winLine: number[] = [];
  let cursor = 4;
  let showCursor = false;
  let endTimer = -1;
  let finished = false;
  let time = 0;

  const startRound = () => {
    board = createBoard();
    winLine = [];
    const playerFirst = round % 2 === 1;
    phase = playerFirst ? 'player' : 'cpu';
    cpuTimer = CPU_DELAY;
    message = playerFirst ? 'YOUR TURN' : 'NPC...';
  };

  const settle = (): boolean => {
    const w = winner(board);
    if (w) {
      winLine = w.line;
      if (w.mark === 'X') {
        wins++;
        message = 'YOU WIN';
        ctx.audio.play('clear');
      } else {
        losses++;
        message = 'NPC WINS';
        ctx.audio.play('die');
      }
    } else if (isDraw(board)) {
      draws++;
      message = 'DRAW';
      ctx.audio.play('select');
    } else {
      return false;
    }
    ctx.setScore(seriesScore(wins, draws));
    phase = 'result';
    resultTimer = RESULT_DELAY;
    return true;
  };

  const place = (i: number) => {
    if (phase !== 'player' || board[i] !== null) return;
    board[i] = 'X';
    ctx.audio.play('flag');
    if (!settle()) {
      phase = 'cpu';
      cpuTimer = CPU_DELAY;
      message = 'NPC...';
    }
  };

  return {
    init(context) {
      ctx = context;
      round = 1;
      wins = 0;
      draws = 0;
      losses = 0;
      cursor = 4;
      showCursor = false;
      endTimer = -1;
      finished = false;
      time = 0;
      startRound();
    },

    update(dt) {
      time += dt;
      if (endTimer >= 0) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          const headline = wins > losses ? 'YOU WIN!' : wins === losses ? 'DRAW' : 'GAME OVER';
          ctx.finish({ score: seriesScore(wins, draws), completed: true, headline });
        }
        return;
      }
      if (phase === 'cpu') {
        cpuTimer -= dt;
        if (cpuTimer <= 0) {
          const i = chooseMove(board, 'O', SKILL[ctx.difficulty], ctx.random);
          if (i >= 0) board[i] = 'O';
          ctx.audio.play('reveal');
          if (!settle()) {
            phase = 'player';
            message = 'YOUR TURN';
          }
        }
        return;
      }
      if (phase === 'result') {
        resultTimer -= dt;
        if (resultTimer <= 0) {
          if (round >= ROUNDS) endTimer = 0.2;
          else {
            round++;
            startRound();
          }
        }
        return;
      }
      const { input } = ctx;
      const moves: [Parameters<typeof input.wasPressed>[0], number, number][] = [
        ['left', -1, 0],
        ['right', 1, 0],
        ['up', 0, -1],
        ['down', 0, 1],
      ];
      for (const [action, dx, dy] of moves) {
        if (!input.wasPressed(action)) continue;
        showCursor = true;
        const x = Math.min(2, Math.max(0, (cursor % 3) + dx));
        const y = Math.min(2, Math.max(0, Math.floor(cursor / 3) + dy));
        cursor = y * 3 + x;
      }
      if (input.wasPressed('primary')) {
        showCursor = true;
        place(cursor);
      }
    },

    onPointer(e: PointerInfo) {
      if (e.type !== 'down') return;
      const cx = Math.floor((e.x - BOARD_X) / CELL);
      const cy = Math.floor((e.y - BOARD_Y) / CELL);
      if (cx < 0 || cy < 0 || cx > 2 || cy > 2) return;
      showCursor = false;
      cursor = cy * 3 + cx;
      place(cursor);
    },

    render() {
      const g = ctx.ctx;
      clear(g, WIDTH, HEIGHT);
      drawText(g, `ROUND ${Math.min(round, ROUNDS)}/${ROUNDS}`, BOARD_X, 14, { color: COLORS.muted });
      drawText(g, `W${wins} D${draws} L${losses}`, WIDTH - BOARD_X, 14, { color: COLORS.gold, align: 'right' });

      const flash = Math.floor(time * 6) % 2 === 0;
      for (let i = 0; i < 9; i++) {
        const x = BOARD_X + (i % 3) * CELL;
        const y = BOARD_Y + Math.floor(i / 3) * CELL;
        g.fillStyle = winLine.includes(i) && flash ? '#3a3a20' : COLORS.panel;
        g.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
        if (board[i] === 'X') drawX(g, x, y, CELL);
        else if (board[i] === 'O') drawO(g, x, y, CELL);
      }
      g.fillStyle = COLORS.panelLight;
      for (let k = 1; k < 3; k++) {
        g.fillRect(BOARD_X + k * CELL - 1, BOARD_Y, 2, CELL * 3);
        g.fillRect(BOARD_X, BOARD_Y + k * CELL - 1, CELL * 3, 2);
      }
      if (showCursor && phase === 'player') {
        g.strokeStyle = COLORS.gold;
        g.lineWidth = 2;
        g.strokeRect(BOARD_X + (cursor % 3) * CELL + 3, BOARD_Y + Math.floor(cursor / 3) * CELL + 3, CELL - 6, CELL - 6);
      }
      const color = message === 'YOU WIN' ? COLORS.cyan : message === 'NPC WINS' ? COLORS.red : COLORS.text;
      drawText(g, message, WIDTH / 2, HEIGHT - 20, { color, align: 'center' });
    },

    destroy() {
      return;
    },
  };
}
