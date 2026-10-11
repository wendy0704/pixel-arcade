import { clear, COLORS, drawBevel, drawText } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import { approach, CARD_H, CARD_W, CONFIG, createState, flip, GAP, hideMismatch, HUD, isComplete, type MemoryState } from './logic';
import { drawCardBack, drawCardFace } from './cards';

const FLIP_TIME = 0.15;
const MISMATCH_DELAY = 0.7;

export function createGame(): Game {
  let ctx!: GameContext;
  let cols = 4;
  let state!: MemoryState;
  let progress: number[] = [];
  let elapsed = 0;
  let started = false;
  let hideTimer = -1;
  let endTimer = -1;
  let finished = false;
  let cursor = 0;
  let showCursor = false;

  const cardX = (i: number) => GAP + (i % cols) * (CARD_W + GAP);
  const cardY = (i: number) => HUD + GAP + Math.floor(i / cols) * (CARD_H + GAP);

  const pick = (i: number) => {
    if (hideTimer >= 0 || endTimer >= 0) return;
    const result = flip(state, i);
    if (result === 'none') return;
    started = true;
    if (result === 'first') ctx.audio.play('reveal');
    else if (result === 'match') {
      ctx.audio.play('eat');
      if (isComplete(state)) {
        endTimer = 0.8;
        ctx.audio.play('clear');
      }
    } else {
      ctx.audio.play('flag');
      hideTimer = MISMATCH_DELAY;
    }
  };

  return {
    init(context) {
      ctx = context;
      const cfg = CONFIG[ctx.difficulty];
      cols = cfg.cols;
      state = createState((cfg.cols * cfg.rows) / 2, ctx.random);
      progress = state.cards.map(() => 0);
      elapsed = 0;
      started = false;
      hideTimer = -1;
      endTimer = -1;
      finished = false;
      cursor = 0;
      showCursor = false;
    },

    update(dt) {
      state.cards.forEach((c, i) => {
        const target = c.open || c.matched ? 1 : 0;
        const step = dt / FLIP_TIME;
        progress[i] = approach(progress[i], target, step);
      });
      if (endTimer >= 0) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          ctx.finish({ score: Math.round(elapsed * 10) / 10, completed: true, headline: 'CLEAR!' });
        }
        return;
      }
      if (started) {
        elapsed += dt;
        ctx.setScore(Math.round(elapsed * 10) / 10);
      }
      if (hideTimer >= 0) {
        hideTimer -= dt;
        if (hideTimer < 0) hideMismatch(state);
      }
      const { input } = ctx;
      const total = state.cards.length;
      const moves: [Parameters<typeof input.wasPressed>[0], number][] = [
        ['left', -1],
        ['right', 1],
        ['up', -cols],
        ['down', cols],
      ];
      for (const [action, d] of moves) {
        if (!input.wasPressed(action)) continue;
        showCursor = true;
        const next = cursor + d;
        const sameRow = Math.abs(d) !== 1 || Math.floor(next / cols) === Math.floor(cursor / cols);
        if (next >= 0 && next < total && sameRow) cursor = next;
      }
      if (input.wasPressed('primary')) {
        showCursor = true;
        pick(cursor);
      }
    },

    onPointer(e: PointerInfo) {
      if (e.type !== 'down') return;
      showCursor = false;
      const i = state.cards.findIndex((_, k) => e.x >= cardX(k) && e.x < cardX(k) + CARD_W && e.y >= cardY(k) && e.y < cardY(k) + CARD_H);
      if (i >= 0) {
        cursor = i;
        pick(i);
      }
    },

    render() {
      const g = ctx.ctx;
      clear(g, ctx.width, ctx.height);
      drawText(g, `MOVES ${state.moves}`, GAP, 8, { color: COLORS.muted });
      drawText(g, `${state.pairsFound}/${state.pairs}`, ctx.width - GAP, 8, { color: COLORS.gold, align: 'right' });
      state.cards.forEach((c, i) => {
        const p = progress[i];
        const w = Math.max(2, Math.round(CARD_W * Math.abs(1 - 2 * p)));
        const x = cardX(i) + Math.round((CARD_W - w) / 2);
        const y = cardY(i);
        if (p < 0.5) drawCardBack(g, x, y, w, CARD_H);
        else if (w >= 32) drawCardFace(g, c.icon, x, y, w, CARD_H, c.matched);
        else drawBevel(g, x, y, w, CARD_H, COLORS.panelLight, 2);
      });
      if (showCursor) {
        g.strokeStyle = COLORS.gold;
        g.lineWidth = 2;
        g.strokeRect(cardX(cursor) - 3, cardY(cursor) - 3, CARD_W + 6, CARD_H + 6);
      }
    },

    destroy() {
      return;
    },
  };
}
