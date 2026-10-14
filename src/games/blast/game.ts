import { clear, COLORS, drawText } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import { drawBlock, drawShape, EMPTY_CELL, PIECE_COLORS } from './draw';
import {
  anyFits,
  type Board,
  canPlace,
  type ComboState,
  CONFIG,
  createBoard,
  deal,
  fits,
  lineCells,
  type Piece,
  place,
  previewLines,
  scorePlacement,
  SHAPES,
  SIZE,
} from './logic';

export const WIDTH = 240;
export const HEIGHT = 340;
export const CELL = 26;
export const BOARD_X = 16;
export const BOARD_Y = 30;
export const TRAY_Y = 252;
export const TRAY_CELL = 13;
export const SLOT_W = 80;
const TRAY_H = 84;
const TOUCH_LIFT = 30;
const FLASH_TIME = 0.35;
const POPUP_TIME = 0.9;
const END_DELAY = 1.6;

interface Drag {
  slot: number;
  x: number;
  y: number;
  touch: boolean;
}

interface Target {
  col: number;
  row: number;
  valid: boolean;
}

export function dragTarget(piece: Piece, x: number, y: number, touch: boolean): { col: number; row: number; left: number; top: number } {
  const s = SHAPES[piece.shape];
  const cy = y - (touch ? (s.h * CELL) / 2 + TOUCH_LIFT : 0);
  const left = x - (s.w * CELL) / 2;
  const top = cy - (s.h * CELL) / 2;
  return { col: Math.round((left - BOARD_X) / CELL), row: Math.round((top - BOARD_Y) / CELL), left, top };
}

export const slotCenter = (slot: number) => ({ x: SLOT_W / 2 + slot * SLOT_W, y: TRAY_Y + TRAY_H / 2 });

export function createGame(): Game {
  let ctx!: GameContext;
  let board: Board = createBoard();
  let hand: (Piece | null)[] = [];
  let combo: ComboState = { combo: 0, miss: 0 };
  let score = 0;
  let drag: Drag | null = null;
  let keys = { active: false, slot: 0, col: 2, row: 2 };
  let flashes: { index: number; color: number; t: number }[] = [];
  let popups: { text: string; x: number; y: number; t: number; color: string }[] = [];
  let over = false;
  let endTimer = -1;
  let finished = false;

  const config = () => CONFIG[ctx.difficulty];

  const firstSlot = (from: number) => {
    for (let k = 0; k < hand.length; k++) {
      const i = (from + k) % hand.length;
      if (hand[i]) return i;
    }
    return 0;
  };

  const clampKeys = () => {
    const piece = hand[keys.slot];
    if (!piece) return;
    const s = SHAPES[piece.shape];
    keys.col = Math.min(SIZE - s.w, Math.max(0, keys.col));
    keys.row = Math.min(SIZE - s.h, Math.max(0, keys.row));
  };

  const popup = (text: string, x: number, y: number, color: string) => popups.push({ text, x, y, t: 0, color });

  const placeFrom = (slot: number, col: number, row: number): boolean => {
    const piece = hand[slot];
    if (!piece || over) return false;
    const s = SHAPES[piece.shape];
    if (!canPlace(board, s, col, row)) {
      ctx.audio.play('flag');
      return false;
    }
    const result = place(board, s, col, row, piece.color);
    const empty = board.every((v) => v === 0);
    const points = scorePlacement(s.cells.length, result.lines, combo, empty);
    score += points;
    ctx.setScore(score);
    hand[slot] = null;
    const cx = BOARD_X + (col + s.w / 2) * CELL;
    const cy = BOARD_Y + (row + s.h / 2) * CELL;
    if (result.lines) {
      flashes.push(...result.cleared.map((c) => ({ ...c, t: 0 })));
      popup(`+${points}`, cx, cy - 8, COLORS.gold);
      if (combo.combo >= 2) popup(`COMBO x${combo.combo}`, WIDTH / 2, BOARD_Y + 4 * CELL - 16, COLORS.pink);
      if (empty) popup('ALL CLEAR!', WIDTH / 2, BOARD_Y + 4 * CELL + 8, COLORS.cyan);
      ctx.audio.play(result.lines >= 3 ? 'tetris' : 'line');
    } else ctx.audio.play('lock');
    if (hand.every((p) => p === null)) hand = deal(board, config(), ctx.random);
    keys.slot = firstSlot(slot);
    clampKeys();
    if (!anyFits(board, hand)) {
      over = true;
      endTimer = END_DELAY;
      ctx.audio.play('die');
    }
    return true;
  };

  const hitSlot = (x: number, y: number) => {
    if (y < TRAY_Y - 12 || y > TRAY_Y + TRAY_H) return -1;
    const slot = Math.floor(x / SLOT_W);
    return slot >= 0 && slot < hand.length && hand[slot] ? slot : -1;
  };

  const keyboardTarget = (): Target | null => {
    const piece = hand[keys.slot];
    if (!keys.active || !piece || drag) return null;
    return { col: keys.col, row: keys.row, valid: canPlace(board, SHAPES[piece.shape], keys.col, keys.row) };
  };

  const dragTargetNow = (): Target | null => {
    if (!drag) return null;
    const piece = hand[drag.slot];
    if (!piece) return null;
    const { col, row } = dragTarget(piece, drag.x, drag.y, drag.touch);
    return { col, row, valid: canPlace(board, SHAPES[piece.shape], col, row) };
  };

  return {
    init(context) {
      ctx = context;
      board = createBoard();
      combo = { combo: 0, miss: 0 };
      score = 0;
      drag = null;
      keys = { active: false, slot: 0, col: 2, row: 2 };
      flashes = [];
      popups = [];
      over = false;
      endTimer = -1;
      finished = false;
      hand = deal(board, config(), ctx.random);
      ctx.setScore(0);
    },

    update(dt) {
      flashes = flashes.filter((f) => (f.t += dt) < FLASH_TIME);
      popups = popups.filter((p) => (p.t += dt) < POPUP_TIME);
      if (over) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          ctx.finish({ score, completed: true, headline: 'GAME OVER' });
        }
        return;
      }
      const { input } = ctx;
      const dirs: ['left' | 'right' | 'up' | 'down', number, number][] = [
        ['left', -1, 0],
        ['right', 1, 0],
        ['up', 0, -1],
        ['down', 0, 1],
      ];
      for (const [a, dx, dy] of dirs) {
        if (!input.wasPressed(a)) continue;
        if (keys.active) {
          keys.col += dx;
          keys.row += dy;
        }
        keys.active = true;
        keys.slot = firstSlot(keys.slot);
        clampKeys();
        ctx.audio.play('move');
      }
      if (input.wasPressed('secondary')) {
        keys.active = true;
        keys.slot = firstSlot(keys.slot + 1);
        clampKeys();
        ctx.audio.play('select');
      }
      if (input.wasPressed('primary')) {
        if (!keys.active) {
          keys.active = true;
          keys.slot = firstSlot(keys.slot);
          clampKeys();
        } else placeFrom(keys.slot, keys.col, keys.row);
      }
    },

    onKey(key: string) {
      if (key >= '1' && key <= '3' && hand[Number(key) - 1]) {
        keys.active = true;
        keys.slot = Number(key) - 1;
        clampKeys();
        ctx.audio.play('select');
        return true;
      }
      return false;
    },

    onPointer(e: PointerInfo) {
      if (over) return;
      if (e.type === 'down') {
        const slot = hitSlot(e.x, e.y);
        if (slot < 0) return;
        drag = { slot, x: e.x, y: e.y, touch: e.pointerType !== 'mouse' };
        keys.active = false;
        keys.slot = slot;
        ctx.audio.play('select');
        return;
      }
      if (!drag) return;
      if (e.type === 'move') {
        drag.x = e.x;
        drag.y = e.y;
        return;
      }
      if (e.type === 'up') {
        drag.x = e.x;
        drag.y = e.y;
        const target = dragTargetNow();
        const slot = drag.slot;
        drag = null;
        if (target?.valid) placeFrom(slot, target.col, target.row);
        else if (e.y < TRAY_Y) ctx.audio.play('flag');
      }
    },

    render() {
      const g = ctx.ctx;
      clear(g, WIDTH, HEIGHT);
      if (combo.combo >= 2) drawText(g, `COMBO x${combo.combo}`, BOARD_X, 10, { color: COLORS.pink });
      const pending = hand.filter(Boolean).length;
      drawText(g, `NEXT ${pending}/3`, WIDTH - BOARD_X, 10, { color: COLORS.muted, align: 'right' });

      g.fillStyle = '#121226';
      g.fillRect(BOARD_X - 4, BOARD_Y - 4, SIZE * CELL + 8, SIZE * CELL + 8);
      for (let i = 0; i < SIZE * SIZE; i++) {
        const x = BOARD_X + (i % SIZE) * CELL;
        const y = BOARD_Y + Math.floor(i / SIZE) * CELL;
        if (board[i]) drawBlock(g, x, y, CELL, PIECE_COLORS[board[i] - 1]);
        else {
          g.fillStyle = EMPTY_CELL;
          g.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        }
      }

      const target = dragTargetNow() ?? keyboardTarget();
      const active = drag ? hand[drag.slot] : hand[keys.slot];
      if (target && active) {
        const s = SHAPES[active.shape];
        const color = PIECE_COLORS[active.color];
        if (target.valid) {
          const lines = lineCells(previewLines(board, s, target.col, target.row));
          g.globalAlpha = 0.55;
          for (const index of lines) {
            if (!board[index]) continue;
            drawBlock(g, BOARD_X + (index % SIZE) * CELL, BOARD_Y + Math.floor(index / SIZE) * CELL, CELL, color);
          }
          g.globalAlpha = 0.4;
          drawShape(g, s, BOARD_X + target.col * CELL, BOARD_Y + target.row * CELL, CELL, color);
          g.globalAlpha = 1;
        } else if (!drag) {
          g.fillStyle = COLORS.red;
          for (const [c, r] of s.cells) {
            const col = target.col + c;
            const row = target.row + r;
            if (col < 0 || row < 0 || col >= SIZE || row >= SIZE) continue;
            const x = BOARD_X + col * CELL;
            const y = BOARD_Y + row * CELL;
            g.fillRect(x + 2, y + 2, CELL - 4, 2);
            g.fillRect(x + 2, y + CELL - 4, CELL - 4, 2);
            g.fillRect(x + 2, y + 2, 2, CELL - 4);
            g.fillRect(x + CELL - 4, y + 2, 2, CELL - 4);
          }
        }
      }

      for (const f of flashes) {
        const k = 1 - f.t / FLASH_TIME;
        const size = Math.max(2, Math.round(CELL * k));
        const x = BOARD_X + (f.index % SIZE) * CELL + (CELL - size) / 2;
        const y = BOARD_Y + Math.floor(f.index / SIZE) * CELL + (CELL - size) / 2;
        g.fillStyle = f.t < FLASH_TIME / 3 ? '#ffffff' : PIECE_COLORS[f.color];
        g.fillRect(Math.round(x), Math.round(y), size, size);
      }

      g.fillStyle = COLORS.panel;
      g.fillRect(4, TRAY_Y, WIDTH - 8, TRAY_H);
      hand.forEach((piece, slot) => {
        const center = slotCenter(slot);
        if (keys.active && slot === keys.slot && piece) {
          g.fillStyle = COLORS.pink;
          g.fillRect(center.x - 14, TRAY_Y + TRAY_H - 6, 28, 2);
        }
        if (!piece || (drag && drag.slot === slot)) return;
        const s = SHAPES[piece.shape];
        g.globalAlpha = fits(board, s) ? 1 : 0.3;
        drawShape(g, s, center.x - (s.w * TRAY_CELL) / 2, center.y - (s.h * TRAY_CELL) / 2, TRAY_CELL, PIECE_COLORS[piece.color]);
        g.globalAlpha = 1;
      });

      if (drag) {
        const piece = hand[drag.slot];
        if (piece) {
          const { left, top } = dragTarget(piece, drag.x, drag.y, drag.touch);
          g.globalAlpha = 0.9;
          drawShape(g, SHAPES[piece.shape], left, top, CELL, PIECE_COLORS[piece.color]);
          g.globalAlpha = 1;
        }
      }

      for (const p of popups) {
        const k = p.t / POPUP_TIME;
        g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        drawText(g, p.text, p.x, p.y - k * 18, { color: p.color, align: 'center', baseline: 'middle' });
        g.globalAlpha = 1;
      }

      if (over) {
        g.fillStyle = 'rgba(11,11,26,0.6)';
        g.fillRect(BOARD_X, BOARD_Y, SIZE * CELL, SIZE * CELL);
        drawText(g, 'NO SPACE', WIDTH / 2, BOARD_Y + 4 * CELL, { size: 16, color: COLORS.red, align: 'center', baseline: 'middle' });
      }
    },

    destroy() {
      return;
    },
  };
}
