import { clear, COLORS, drawBevel, drawSprite, drawText } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import {
  boxOf,
  CELLS,
  clearNoteFromPeers,
  colOf,
  CONFIG,
  countGivens,
  digitCounts,
  findConflicts,
  formatTime,
  generatePuzzle,
  isSolved,
  rowOf,
  SIZE,
  toggleNote,
  type Grid,
} from './logic';
import { MINI_DIGITS } from './sprites';

export const WIDTH = 240;
export const HEIGHT = 320;
export const CELL = 24;
export const BOARD_X = 12;
export const BOARD_Y = 22;
const BOARD = CELL * SIZE;
const KEYS_Y = 246;
const KEY_H = 30;
const TOOLS_Y = 284;
const TOOL_H = 26;
const TOOL_W = 106;
const END_DELAY = 1.4;

type Button = { kind: 'digit'; digit: number } | { kind: 'note' } | { kind: 'erase' };

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const BUTTONS: { button: Button; rect: Rect }[] = [
  ...Array.from({ length: 9 }, (_, i) => ({
    button: { kind: 'digit', digit: i + 1 } as Button,
    rect: { x: BOARD_X + i * CELL, y: KEYS_Y, w: CELL - 2, h: KEY_H },
  })),
  { button: { kind: 'note' }, rect: { x: BOARD_X, y: TOOLS_Y, w: TOOL_W, h: TOOL_H } },
  { button: { kind: 'erase' }, rect: { x: BOARD_X + BOARD - TOOL_W - 2, y: TOOLS_Y, w: TOOL_W, h: TOOL_H } },
];

const inside = (r: Rect, x: number, y: number) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

export function createGame(): Game {
  let ctx!: GameContext;
  let grid: Grid = [];
  let given: boolean[] = [];
  let notes: number[] = [];
  let conflicts: boolean[] = [];
  let cursor = 40;
  let noteMode = false;
  let elapsed = 0;
  let shownSecond = -1;
  let won = false;
  let winTime = 0;
  let endTimer = -1;
  let finished = false;
  let pressed = -1;
  let pressTimer = 0;

  const refresh = () => {
    conflicts = findConflicts(grid);
  };

  const place = (digit: number) => {
    if (won || given[cursor]) return;
    if (noteMode) {
      if (grid[cursor]) return;
      toggleNote(notes, cursor, digit);
      ctx.audio.play('flag');
      return;
    }
    if (grid[cursor] === digit) {
      grid[cursor] = 0;
      refresh();
      ctx.audio.play('flag');
      return;
    }
    grid[cursor] = digit;
    notes[cursor] = 0;
    clearNoteFromPeers(notes, cursor, digit);
    refresh();
    if (isSolved(grid)) {
      won = true;
      winTime = 0;
      endTimer = END_DELAY;
      ctx.setScore(Math.floor(elapsed));
      ctx.audio.play('clear');
    } else {
      ctx.audio.play(conflicts[cursor] ? 'die' : 'move');
    }
  };

  const erase = () => {
    if (won || given[cursor]) return;
    if (!grid[cursor] && !notes[cursor]) return;
    grid[cursor] = 0;
    notes[cursor] = 0;
    refresh();
    ctx.audio.play('flag');
  };

  const toggleMode = () => {
    if (won) return;
    noteMode = !noteMode;
    ctx.audio.play('select');
  };

  const press = (index: number) => {
    pressed = index;
    pressTimer = 0.12;
    const { button } = BUTTONS[index];
    if (button.kind === 'digit') place(button.digit);
    else if (button.kind === 'note') toggleMode();
    else erase();
  };

  const pressDigit = (digit: number) => press(digit - 1);

  const moveCursor = (dr: number, dc: number) => {
    const r = (rowOf(cursor) + dr + SIZE) % SIZE;
    const c = (colOf(cursor) + dc + SIZE) % SIZE;
    cursor = r * SIZE + c;
  };

  return {
    init(context) {
      ctx = context;
      const { puzzle } = generatePuzzle(CONFIG[ctx.difficulty].givens, ctx.random);
      grid = puzzle.slice();
      given = puzzle.map((v) => v > 0);
      notes = new Array<number>(CELLS).fill(0);
      cursor = given.indexOf(false);
      noteMode = false;
      elapsed = 0;
      shownSecond = -1;
      won = false;
      winTime = 0;
      endTimer = -1;
      finished = false;
      pressed = -1;
      pressTimer = 0;
      refresh();
    },

    update(dt) {
      if (pressTimer > 0) pressTimer -= dt;
      if (won) {
        winTime += dt;
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          ctx.finish({ score: Math.floor(elapsed), completed: true, headline: 'CLEAR!' });
        }
        return;
      }
      elapsed += dt;
      const second = Math.floor(elapsed);
      if (second !== shownSecond) {
        shownSecond = second;
        ctx.setScore(second);
      }
      const input = ctx.input;
      if (input.wasPressed('up')) moveCursor(-1, 0);
      if (input.wasPressed('down')) moveCursor(1, 0);
      if (input.wasPressed('left')) moveCursor(0, -1);
      if (input.wasPressed('right')) moveCursor(0, 1);
      if (input.wasPressed('primary')) press(9);
      if (input.wasPressed('secondary')) press(10);
    },

    onKey(key: string) {
      if (/^[1-9]$/.test(key)) {
        pressDigit(Number(key));
        return true;
      }
      if (key === '0' || key === 'Backspace' || key === 'Delete') {
        press(10);
        return true;
      }
      if (key === 'n' || key === 'N') {
        press(9);
        return true;
      }
      return false;
    },

    onPointer(e: PointerInfo) {
      if (e.type !== 'down' || won) return;
      if (e.x >= BOARD_X && e.x < BOARD_X + BOARD && e.y >= BOARD_Y && e.y < BOARD_Y + BOARD) {
        const c = Math.floor((e.x - BOARD_X) / CELL);
        const r = Math.floor((e.y - BOARD_Y) / CELL);
        cursor = r * SIZE + c;
        return;
      }
      const index = BUTTONS.findIndex((b) => inside(b.rect, e.x, e.y));
      if (index >= 0) press(index);
    },

    render() {
      const g = ctx.ctx;
      clear(g, WIDTH, HEIGHT);
      drawText(g, formatTime(elapsed), BOARD_X, 7, { color: COLORS.text });
      const remaining = CELLS - countGivens(grid);
      drawText(g, `LEFT ${remaining}`, BOARD_X + BOARD, 7, { color: COLORS.gold, align: 'right' });

      const focus = grid[cursor];
      g.fillStyle = COLORS.panel;
      g.fillRect(BOARD_X, BOARD_Y, BOARD, BOARD);
      for (let i = 0; i < CELLS; i++) {
        const x = BOARD_X + colOf(i) * CELL;
        const y = BOARD_Y + rowOf(i) * CELL;
        let fill = '';
        if (won) {
          const wave = winTime * 14 - (rowOf(i) + colOf(i));
          if (wave > 0 && wave < 3) fill = '#1f5f6a';
        } else if (i === cursor) fill = '#43437a';
        else if (focus && grid[i] === focus) fill = '#33336a';
        else if (rowOf(i) === rowOf(cursor) || colOf(i) === colOf(cursor) || boxOf(i) === boxOf(cursor)) fill = '#222240';
        if (conflicts[i] && !won) fill = '#5a1f33';
        if (fill) {
          g.fillStyle = fill;
          g.fillRect(x, y, CELL, CELL);
        }
        if (grid[i]) {
          const color = conflicts[i] ? COLORS.red : given[i] ? COLORS.text : COLORS.cyan;
          drawText(g, String(grid[i]), x + CELL / 2 + 1, y + 5, { size: 16, color, align: 'center' });
        } else if (notes[i]) {
          for (let d = 1; d <= 9; d++) {
            if (!(notes[i] & (1 << d))) continue;
            const nx = x + 2 + ((d - 1) % 3) * 7;
            const ny = y + 2 + Math.floor((d - 1) / 3) * 7;
            drawSprite(g, MINI_DIGITS[d], nx + 2, ny + 1, focus === d ? COLORS.gold : '#b4b4d4');
          }
        }
      }

      g.fillStyle = '#2e2e52';
      for (let k = 1; k < SIZE; k++) {
        if (k % 3 === 0) continue;
        g.fillRect(BOARD_X + k * CELL, BOARD_Y, 1, BOARD);
        g.fillRect(BOARD_X, BOARD_Y + k * CELL, BOARD, 1);
      }
      g.fillStyle = '#6a6aa8';
      for (let k = 0; k <= SIZE; k += 3) {
        g.fillRect(BOARD_X + k * CELL - 1, BOARD_Y - 1, 2, BOARD + 2);
        g.fillRect(BOARD_X - 1, BOARD_Y + k * CELL - 1, BOARD + 2, 2);
      }
      if (!won) {
        const cx = BOARD_X + colOf(cursor) * CELL;
        const cy = BOARD_Y + rowOf(cursor) * CELL;
        g.strokeStyle = noteMode ? COLORS.gold : COLORS.pink;
        g.lineWidth = 2;
        g.strokeRect(cx + 1, cy + 1, CELL - 2, CELL - 2);
      }

      const counts = digitCounts(grid);
      BUTTONS.forEach(({ button, rect }, index) => {
        const isPressed = pressed === index && pressTimer > 0;
        if (button.kind === 'digit') {
          const done = counts[button.digit] >= 9;
          drawBevel(g, rect.x, rect.y, rect.w, rect.h, isPressed ? COLORS.cyan : done ? COLORS.panel : COLORS.panelLight, 2);
          drawText(g, String(button.digit), rect.x + rect.w / 2 + 1, rect.y + 7, {
            size: 16,
            color: done ? COLORS.muted : noteMode ? COLORS.gold : COLORS.text,
            align: 'center',
          });
        } else if (button.kind === 'note') {
          drawBevel(g, rect.x, rect.y, rect.w, rect.h, isPressed ? COLORS.cyan : noteMode ? '#8a6a10' : COLORS.panelLight, 2);
          drawText(g, noteMode ? 'NOTE ON' : 'NOTE OFF', rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, {
            color: noteMode ? COLORS.gold : COLORS.text,
            align: 'center',
            baseline: 'middle',
          });
        } else {
          drawBevel(g, rect.x, rect.y, rect.w, rect.h, isPressed ? COLORS.cyan : '#4a4a80', 2);
          drawText(g, 'ERASE', rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, { align: 'center', baseline: 'middle' });
        }
      });
    },

    destroy() {
      return;
    },
  };
}
