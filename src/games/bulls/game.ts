import { clear, COLORS, drawBevel, drawText } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import { CONFIG, formatJudgement, generateSecret, judge, validateGuess, type GuessError, type GuessRecord } from './logic';

export const WIDTH = 240;
export const HEIGHT = 360;
const ROW_H = 18;
const LIST_TOP = 26;
const VISIBLE_ROWS = 9;
const SLOT_Y = 200;
const MSG_Y = 238;
const PAD_TOP = 252;
const KEY_W = 76;
const KEY_H = 24;
const KEY_GAP = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'OK'];

const ERROR_TEXT: Record<GuessError, string> = {
  length: 'NOT ENOUGH DIGITS',
  repeat: 'NO REPEATED DIGITS',
  digits: 'DIGITS ONLY',
  duplicate: 'ALREADY GUESSED',
};

const SLOT_W = 26;
const SLOT_GAP = 8;
const SLOT_H = 30;

function slotRect(i: number, length: number) {
  const total = length * SLOT_W + (length - 1) * SLOT_GAP;
  return { x: Math.round((WIDTH - total) / 2 + i * (SLOT_W + SLOT_GAP)), y: SLOT_Y, w: SLOT_W, h: SLOT_H };
}

function keyRect(i: number) {
  return {
    x: 2 + (i % 3) * (KEY_W + KEY_GAP),
    y: PAD_TOP + Math.floor(i / 3) * (KEY_H + KEY_GAP),
    w: KEY_W,
    h: KEY_H,
  };
}

export function createGame(): Game {
  let ctx!: GameContext;
  let length = 4;
  let secret = '';
  let slots: string[] = [];
  let active = 0;
  let history: GuessRecord[] = [];
  let message = '';
  let messageTimer = 0;
  let pressed = -1;
  let pressTimer = 0;
  let won = false;
  let endTimer = -1;
  let finished = false;
  let time = 0;

  const flash = (i: number) => {
    pressed = i;
    pressTimer = 0.12;
  };

  const usedElsewhere = (digit: string) => slots.some((d, i) => i !== active && d === digit);

  const nextEmpty = (from: number) => {
    for (let k = 1; k <= length; k++) {
      const i = (from + k) % length;
      if (!slots[i]) return i;
    }
    return from;
  };

  const type = (digit: string) => {
    if (won || usedElsewhere(digit)) return;
    slots[active] = digit;
    active = nextEmpty(active);
    ctx.audio.play('move');
  };

  const erase = () => {
    if (won) return;
    if (!slots[active] && active > 0) active--;
    if (!slots[active]) return;
    slots[active] = '';
    ctx.audio.play('flag');
  };

  const select = (i: number) => {
    if (won || i < 0 || i >= length) return;
    active = i;
    ctx.audio.play('reveal');
  };

  const submit = () => {
    if (won) return;
    const input = slots.join('');
    const error = validateGuess(input, length, history);
    if (error) {
      message = ERROR_TEXT[error];
      messageTimer = 1.4;
      ctx.audio.play('die');
      return;
    }
    const result = judge(secret, input);
    history.push({ guess: input, ...result });
    slots = Array<string>(length).fill('');
    active = 0;
    ctx.setScore(history.length);
    if (result.a === length) {
      won = true;
      message = 'YOU GOT IT!';
      messageTimer = 99;
      ctx.audio.play('clear');
      endTimer = 1.0;
    } else {
      ctx.audio.play(result.a > 0 ? 'eat' : 'reveal');
    }
  };

  const press = (key: string) => {
    const i = KEYS.indexOf(key);
    if (i >= 0) flash(i);
    if (key === 'DEL') erase();
    else if (key === 'OK') submit();
    else type(key);
  };

  return {
    init(context) {
      ctx = context;
      length = CONFIG[ctx.difficulty].length;
      secret = generateSecret(length, ctx.random);
      slots = Array<string>(length).fill('');
      active = 0;
      history = [];
      message = '';
      messageTimer = 0;
      pressed = -1;
      won = false;
      endTimer = -1;
      finished = false;
      time = 0;
    },

    update(dt) {
      time += dt;
      if (messageTimer > 0) messageTimer -= dt;
      if (pressTimer > 0) pressTimer -= dt;
      if (endTimer >= 0) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          ctx.finish({ score: history.length, completed: true, headline: 'CLEAR!' });
        }
        return;
      }
      if (ctx.input.wasPressed('left')) select((active + length - 1) % length);
      if (ctx.input.wasPressed('right')) select((active + 1) % length);
      if (ctx.input.wasPressed('primary')) press('OK');
      if (ctx.input.wasPressed('secondary')) press('DEL');
    },

    onKey(key: string) {
      if (/^[0-9]$/.test(key)) {
        press(key);
        return true;
      }
      if (key === 'Backspace' || key === 'Delete') {
        press('DEL');
        return true;
      }
      if (key === 'Enter') {
        press('OK');
        return true;
      }
      return false;
    },

    onPointer(e: PointerInfo) {
      if (e.type !== 'down') return;
      for (let k = 0; k < length; k++) {
        const r = slotRect(k, length);
        if (e.x >= r.x - SLOT_GAP / 2 && e.x < r.x + r.w + SLOT_GAP / 2 && e.y >= r.y - 6 && e.y < r.y + r.h + 6) {
          select(k);
          return;
        }
      }
      const i = KEYS.findIndex((_, k) => {
        const r = keyRect(k);
        return e.x >= r.x && e.x < r.x + r.w && e.y >= r.y && e.y < r.y + r.h;
      });
      if (i >= 0) press(KEYS[i]);
    },

    render() {
      const g = ctx.ctx;
      clear(g, WIDTH, HEIGHT);
      drawText(g, `TRIES ${history.length}`, 8, 8, { color: COLORS.muted });
      drawText(g, `${length} DIGITS`, WIDTH - 8, 8, { color: COLORS.gold, align: 'right' });

      g.fillStyle = COLORS.panel;
      g.fillRect(4, LIST_TOP - 4, WIDTH - 8, VISIBLE_ROWS * ROW_H + 6);
      const start = Math.max(0, history.length - VISIBLE_ROWS);
      history.slice(start).forEach((h, k) => {
        const y = LIST_TOP + k * ROW_H;
        const n = start + k + 1;
        drawText(g, `#${n}`, 12, y + 2, { color: COLORS.muted });
        drawText(g, h.guess.split('').join(' '), 60, y + 2, { color: COLORS.text });
        drawText(g, `${h.a}A`, WIDTH - 60, y + 2, { color: h.a ? COLORS.cyan : COLORS.muted });
        drawText(g, `${h.b}B`, WIDTH - 32, y + 2, { color: h.b ? COLORS.gold : COLORS.muted });
      });
      if (!history.length) {
        drawText(g, 'GUESS THE NUMBER', WIDTH / 2, LIST_TOP + 60, { color: COLORS.muted, align: 'center' });
        drawText(g, 'A = RIGHT DIGIT & PLACE', WIDTH / 2, LIST_TOP + 84, { color: COLORS.cyan, align: 'center' });
        drawText(g, 'B = RIGHT DIGIT ONLY', WIDTH / 2, LIST_TOP + 100, { color: COLORS.gold, align: 'center' });
      }

      for (let i = 0; i < length; i++) {
        const r = slotRect(i, length);
        const isActive = i === active && !won;
        g.fillStyle = isActive ? COLORS.pink : COLORS.panelLight;
        g.fillRect(r.x, r.y, r.w, r.h);
        g.fillStyle = isActive ? '#2a1028' : COLORS.bg;
        g.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
        const ch = won ? secret[i] : slots[i];
        if (ch) drawText(g, ch, r.x + r.w / 2, r.y + 8, { size: 16, color: won ? COLORS.cyan : COLORS.text, align: 'center' });
        else if (isActive && Math.floor(time * 2) % 2 === 0) {
          g.fillStyle = COLORS.pink;
          g.fillRect(r.x + 7, r.y + r.h - 7, r.w - 14, 2);
        }
      }

      if (messageTimer > 0) {
        drawText(g, message, WIDTH / 2, MSG_Y, { color: won ? COLORS.cyan : COLORS.red, align: 'center' });
      } else if (history.length) {
        drawText(g, formatJudgement(history[history.length - 1]), WIDTH / 2, MSG_Y, { color: COLORS.muted, align: 'center' });
      }

      KEYS.forEach((key, i) => {
        const r = keyRect(i);
        const used = key.length === 1 && usedElsewhere(key);
        const isPressed = pressed === i && pressTimer > 0;
        const color = key === 'OK' ? COLORS.pink : key === 'DEL' ? '#4a4a80' : COLORS.panelLight;
        drawBevel(g, r.x, r.y, r.w, r.h, isPressed ? COLORS.cyan : used ? COLORS.panel : color, 2);
        drawText(g, key, r.x + r.w / 2, r.y + r.h / 2 + 1, {
          size: 8,
          color: used ? COLORS.muted : key === 'OK' ? '#ffffff' : COLORS.text,
          align: 'center',
          baseline: 'middle',
        });
      });
    },

    destroy() {
      return;
    },
  };
}
