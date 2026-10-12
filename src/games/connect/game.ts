import { clear, COLORS, drawDisc, drawText } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import { type Board, chooseColumn, COLS, CPU, createBoard, dropRow, findWin, index, isFull, PLAYER, ROUNDS, ROWS, seriesScore } from './logic';

export const WIDTH = 240;
export const HEIGHT = 290;
export const CELL = 32;
export const BOARD_X = 8;
export const BOARD_Y = 64;
const HOVER_Y = 44;
const CPU_DELAY = 0.45;
const RESULT_DELAY = 1.8;
const GRAVITY = 1400;

type Phase = 'player' | 'cpu' | 'falling' | 'result';

const COLOR = { [PLAYER]: COLORS.pink, [CPU]: COLORS.gold } as Record<number, string>;

let frontCache: HTMLCanvasElement | null = null;

function boardFront(): HTMLCanvasElement {
  if (frontCache) return frontCache;
  const canvas = document.createElement('canvas');
  canvas.width = COLS * CELL + 8;
  canvas.height = ROWS * CELL + 8;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#1f2f8a';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#3550c8';
  g.fillRect(0, 0, canvas.width, 2);
  g.globalCompositeOperation = 'destination-out';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) drawDisc(g, 4 + c * CELL + CELL / 2, 4 + r * CELL + CELL / 2, 13, '#000000');
  }
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#16226a';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = 4 + c * CELL + CELL / 2;
      const y = 4 + r * CELL + CELL / 2;
      g.fillRect(x - 6, y + 13, 12, 1);
    }
  }
  frontCache = canvas;
  return canvas;
}

export function createGame(): Game {
  let ctx!: GameContext;
  let board: Board = createBoard();
  let phase: Phase = 'player';
  let round = 1;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let cursor = 3;
  let cpuTimer = 0;
  let resultTimer = 0;
  let falling: { col: number; row: number; who: 1 | 2; y: number; vy: number } | null = null;
  let winCells: number[] = [];
  let message = '';
  let endTimer = -1;
  let finished = false;
  let time = 0;

  const cellX = (c: number) => BOARD_X + c * CELL + CELL / 2;
  const cellY = (r: number) => BOARD_Y + r * CELL + CELL / 2;

  const startRound = () => {
    board = createBoard();
    winCells = [];
    falling = null;
    const playerFirst = round % 2 === 1;
    phase = playerFirst ? 'player' : 'cpu';
    cpuTimer = CPU_DELAY;
    message = playerFirst ? 'YOUR TURN' : 'NPC...';
  };

  const release = (col: number, who: 1 | 2) => {
    const row = dropRow(board, col);
    if (row < 0) return;
    falling = { col, row, who, y: HOVER_Y, vy: 0 };
    phase = 'falling';
  };

  const land = () => {
    if (!falling) return;
    const { col, row, who } = falling;
    board[index(row, col)] = who;
    falling = null;
    ctx.audio.play('lock');
    const win = findWin(board);
    if (win || isFull(board)) {
      if (win) {
        winCells = win.cells;
        if (win.who === PLAYER) {
          wins++;
          message = 'YOU WIN';
          ctx.audio.play('clear');
        } else {
          losses++;
          message = 'NPC WINS';
          ctx.audio.play('die');
        }
      } else {
        draws++;
        message = 'DRAW';
        ctx.audio.play('select');
      }
      ctx.setScore(seriesScore(wins, draws));
      phase = 'result';
      resultTimer = RESULT_DELAY;
      return;
    }
    if (who === PLAYER) {
      phase = 'cpu';
      cpuTimer = CPU_DELAY;
      message = 'NPC...';
    } else {
      phase = 'player';
      message = 'YOUR TURN';
    }
  };

  const playerDrop = (col: number) => {
    if (phase !== 'player' || dropRow(board, col) < 0) return;
    release(col, PLAYER);
  };

  return {
    init(context) {
      ctx = context;
      round = 1;
      wins = 0;
      draws = 0;
      losses = 0;
      cursor = 3;
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
      if (phase === 'falling' && falling) {
        falling.vy += GRAVITY * dt;
        falling.y += falling.vy * dt;
        if (falling.y >= cellY(falling.row)) land();
        return;
      }
      if (phase === 'cpu') {
        cpuTimer -= dt;
        if (cpuTimer <= 0) {
          const col = chooseColumn(board, CPU, ctx.difficulty, ctx.random);
          if (col >= 0) release(col, CPU);
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
      if (input.wasPressed('left')) {
        cursor = Math.max(0, cursor - 1);
        ctx.audio.play('move');
      }
      if (input.wasPressed('right')) {
        cursor = Math.min(COLS - 1, cursor + 1);
        ctx.audio.play('move');
      }
      if (input.wasPressed('primary') || input.wasPressed('down')) playerDrop(cursor);
    },

    onPointer(e: PointerInfo) {
      const col = Math.floor((e.x - BOARD_X) / CELL);
      if (col < 0 || col >= COLS) return;
      if (e.type === 'move' || e.type === 'down') cursor = col;
      if (e.type === 'up' && e.y > HOVER_Y - 20) playerDrop(col);
    },

    render() {
      const g = ctx.ctx;
      clear(g, WIDTH, HEIGHT);
      drawText(g, `ROUND ${Math.min(round, ROUNDS)}/${ROUNDS}`, BOARD_X, 10, { color: COLORS.muted });
      drawText(g, `W${wins} D${draws} L${losses}`, WIDTH - BOARD_X, 10, { color: COLORS.gold, align: 'right' });

      if (phase === 'player') {
        drawDisc(g, cellX(cursor), HOVER_Y, 12, COLORS.pink);
        g.fillStyle = '#ffffff';
        g.fillRect(cellX(cursor) - 1, HOVER_Y + 15, 2, 3);
      }

      const flash = Math.floor(time * 6) % 2 === 0;
      g.fillStyle = '#101038';
      g.fillRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL);
      const piece = (x: number, y: number, who: number, lit: boolean) => {
        drawDisc(g, x, y, 12, lit ? '#ffffff' : COLOR[who]);
        drawDisc(g, x - 3, y - 3, 3, lit ? '#ffffff' : who === PLAYER ? '#ff8ac0' : '#ffe98a');
      };
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const who = board[index(r, c)];
          if (who) piece(cellX(c), cellY(r), who, winCells.includes(index(r, c)) && flash);
        }
      }
      if (falling) piece(cellX(falling.col), falling.y, falling.who, false);
      g.drawImage(boardFront(), BOARD_X - 4, BOARD_Y - 4);
      const color = message === 'YOU WIN' ? COLORS.cyan : message === 'NPC WINS' ? COLORS.red : COLORS.text;
      drawText(g, message, WIDTH / 2, HEIGHT - 18, { color, align: 'center' });
    },

    destroy() {
      return;
    },
  };
}
