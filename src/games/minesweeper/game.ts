import { clear, COLORS, drawText } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import {
  CELL,
  chord,
  CONFIG,
  createBoard,
  flagsPlaced,
  HUD,
  inBounds,
  indexOf,
  reveal,
  roundTime,
  toggleFlag,
  type MineBoard,
} from './logic';
import { drawClosed, drawFlag, drawMine, drawNumber, drawOpen } from './sprites';

interface CellPos {
  x: number;
  y: number;
}

const WIN_DELAY = 0.6;
const LOSE_DELAY = 1.0;

export function createGame(): Game {
  let ctx!: GameContext;
  let board!: MineBoard;
  let elapsed = 0;
  let endTimer = -1;
  let finished = false;
  let cursor: CellPos = { x: 0, y: 0 };
  let showCursor = false;
  let hover: CellPos | null = null;
  let press: { cell: CellPos; suppress: boolean } | null = null;

  const toCell = (px: number, py: number): CellPos | null => {
    const x = Math.floor(px / CELL);
    const y = Math.floor((py - HUD) / CELL);
    return inBounds(board, x, y) && py >= HUD ? { x, y } : null;
  };

  const afterAction = (opened: number[]) => {
    if (board.state === 'lost') {
      ctx.audio.play('boom');
      endTimer = LOSE_DELAY;
    } else if (board.state === 'won') {
      ctx.audio.play('clear');
      endTimer = WIN_DELAY;
    } else if (opened.length) {
      ctx.audio.play('reveal');
    }
  };

  const open = (p: CellPos) => {
    const cell = board.cells[indexOf(board, p.x, p.y)];
    afterAction(cell.open ? chord(board, p.x, p.y, ctx.random) : reveal(board, p.x, p.y, ctx.random));
  };

  const flag = (p: CellPos) => {
    if (toggleFlag(board, p.x, p.y)) ctx.audio.play('flag');
  };

  return {
    init(context) {
      ctx = context;
      const { cols, rows, mines } = CONFIG[ctx.difficulty];
      board = createBoard(cols, rows, mines);
      elapsed = 0;
      endTimer = -1;
      finished = false;
      cursor = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
      showCursor = false;
      hover = null;
      press = null;
    },

    update(dt) {
      if (endTimer >= 0) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          const won = board.state === 'won';
          ctx.finish({ score: roundTime(elapsed), completed: won, headline: won ? 'CLEAR!' : 'GAME OVER' });
        }
        return;
      }
      if (board.state === 'playing') {
        elapsed += dt;
        ctx.setScore(roundTime(elapsed));
      }
      const { input } = ctx;
      const moves: [Parameters<typeof input.wasPressed>[0], number, number][] = [
        ['left', -1, 0],
        ['right', 1, 0],
        ['up', 0, -1],
        ['down', 0, 1],
      ];
      for (const [action, dx, dy] of moves) {
        if (input.wasPressed(action)) {
          showCursor = true;
          cursor = {
            x: Math.min(board.cols - 1, Math.max(0, cursor.x + dx)),
            y: Math.min(board.rows - 1, Math.max(0, cursor.y + dy)),
          };
        }
      }
      if (input.wasPressed('primary')) {
        showCursor = true;
        open(cursor);
      }
      if (input.wasPressed('secondary')) {
        showCursor = true;
        flag(cursor);
      }
    },

    onPointer(e: PointerInfo) {
      if (endTimer >= 0 || finished) return;
      const cell = toCell(e.x, e.y);
      if (e.type === 'move') {
        hover = e.pointerType === 'mouse' ? cell : null;
        return;
      }
      if (e.type === 'down') {
        showCursor = false;
        if (!cell) return;
        press = { cell, suppress: false };
        if (e.button === 'secondary') {
          flag(cell);
          press.suppress = true;
        }
        return;
      }
      if (e.type === 'longpress') {
        if (press && !press.suppress) {
          flag(press.cell);
          press.suppress = true;
        }
        return;
      }
      if (e.type === 'up') {
        const p = press;
        press = null;
        if (!p || p.suppress || !cell || cell.x !== p.cell.x || cell.y !== p.cell.y) return;
        if (ctx.input.isDown('secondary')) flag(cell);
        else open(cell);
      }
    },

    render() {
      const g = ctx.ctx;
      clear(g, ctx.width, ctx.height);
      g.fillStyle = '#000000';
      g.fillRect(0, 0, ctx.width, HUD);
      const remaining = board.mines - flagsPlaced(board);
      drawFlag(g, 4, 6);
      drawText(g, String(remaining).padStart(3, '0'), 16, 6, { color: COLORS.red });
      drawText(g, `${Math.min(999, Math.floor(elapsed))}`.padStart(3, '0'), ctx.width - 4, 6, { color: COLORS.cyan, align: 'right' });

      const lost = board.state === 'lost';
      for (let y = 0; y < board.rows; y++) {
        for (let x = 0; x < board.cols; x++) {
          const i = indexOf(board, x, y);
          const cell = board.cells[i];
          const px = x * CELL;
          const py = HUD + y * CELL;
          const pressed = press && !press.suppress && press.cell.x === x && press.cell.y === y && !cell.flag;
          if (cell.open || pressed) {
            drawOpen(g, px, py, CELL, i === board.exploded ? COLORS.red : undefined);
            if (cell.open && cell.mine) drawMine(g, px + 4, py + 4);
            else if (cell.open && cell.adjacent > 0) drawNumber(g, cell.adjacent, px, py, CELL);
          } else if (lost && cell.mine && !cell.flag) {
            drawOpen(g, px, py, CELL);
            drawMine(g, px + 4, py + 4);
          } else {
            const isHover = hover !== null && hover.x === x && hover.y === y;
            drawClosed(g, px, py, CELL, isHover);
            if (cell.flag) {
              drawFlag(g, px + 4, py + 4);
              if (lost && !cell.mine) {
                g.fillStyle = COLORS.red;
                for (let k = 0; k < 10; k++) {
                  g.fillRect(px + 3 + k, py + 3 + k, 1, 1);
                  g.fillRect(px + 12 - k, py + 3 + k, 1, 1);
                }
              }
            }
          }
        }
      }

      if (showCursor && !finished) {
        g.strokeStyle = COLORS.gold;
        g.lineWidth = 2;
        g.strokeRect(cursor.x * CELL + 1, HUD + cursor.y * CELL + 1, CELL - 2, CELL - 2);
      }
    },

    destroy() {
      return;
    },
  };
}
