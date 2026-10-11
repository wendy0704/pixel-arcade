import { COLORS, drawBevel, drawSprite, drawText } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import {
  BIRD_SCALE,
  BIRD_X,
  CONFIG,
  createFlyer,
  flap,
  GROUND,
  HEIGHT,
  PIPE_W,
  START_Y,
  stepFlyer,
  WIDTH,
  type FlyerState,
} from './logic';
import { BIRD_COLORS, BIRD_FRAMES } from './sprites';

const SKY = '#10103a';
const LIP = 3;
const LIP_H = 8;
const END_DELAY = 0.7;

export function createGame(): Game {
  let ctx!: GameContext;
  let s!: FlyerState;
  let time = 0;
  let endTimer = -1;
  let finished = false;
  let stars: [number, number][] = [];
  let skyline: { x: number; w: number; h: number }[] = [];

  const doFlap = () => {
    if (flap(s)) ctx.audio.play('shoot');
  };

  return {
    init(context) {
      ctx = context;
      s = createFlyer();
      time = 0;
      endTimer = -1;
      finished = false;
      stars = Array.from({ length: 30 }, () => [Math.floor(ctx.random() * WIDTH), Math.floor(ctx.random() * (GROUND - 80))]);
      skyline = [];
      for (let x = 0; x < WIDTH * 2; ) {
        const w = 14 + Math.floor(ctx.random() * 22);
        skyline.push({ x, w, h: 20 + Math.floor(ctx.random() * 50) });
        x += w + 2;
      }
    },

    update(dt) {
      time += dt;
      if (endTimer >= 0) {
        stepFlyer(s, dt, ctx.difficulty, ctx.random);
        if (s.grounded) {
          endTimer -= dt;
          if (endTimer < 0 && !finished) {
            finished = true;
            ctx.finish({ score: s.score, completed: true });
          }
        }
        return;
      }
      if (ctx.input.wasPressed('primary') || ctx.input.wasPressed('up')) doFlap();
      const ev = stepFlyer(s, dt, ctx.difficulty, ctx.random);
      if (ev.scored) {
        ctx.audio.play('eat');
        ctx.setScore(s.score);
      }
      if (ev.died) {
        ctx.audio.play('die');
        endTimer = END_DELAY;
      }
    },

    onPointer(e: PointerInfo) {
      if (e.type === 'down' && endTimer < 0) doFlap();
    },

    render() {
      const g = ctx.ctx;
      const { gap } = CONFIG[ctx.difficulty];
      g.fillStyle = SKY;
      g.fillRect(0, 0, WIDTH, HEIGHT);
      g.fillStyle = '#3a3a6a';
      for (const [x, y] of stars) g.fillRect(x, y, 1, 1);

      const far = (s.scroll * 0.3) % (WIDTH * 2);
      g.fillStyle = '#1c1c4a';
      for (const b of skyline) {
        let x = b.x - far;
        if (x + b.w < 0) x += WIDTH * 2;
        g.fillRect(Math.round(x), GROUND - b.h, b.w, b.h);
      }

      for (const p of s.pipes) {
        const x = Math.round(p.x);
        const top = Math.round(p.gapY - gap / 2);
        const bottom = Math.round(p.gapY + gap / 2);
        drawBevel(g, x, 0, PIPE_W, top, COLORS.green, 3);
        drawBevel(g, x, bottom, PIPE_W, GROUND - bottom, COLORS.green, 3);
        drawBevel(g, x - LIP, top - LIP_H, PIPE_W + LIP * 2, LIP_H, '#2fb86d', 2);
        drawBevel(g, x - LIP, bottom, PIPE_W + LIP * 2, LIP_H, '#2fb86d', 2);
      }

      g.fillStyle = '#3a2a1a';
      g.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
      g.fillStyle = COLORS.orange;
      g.fillRect(0, GROUND, WIDTH, 2);
      g.fillStyle = '#5a3a20';
      const offset = Math.round(s.scroll) % 16;
      for (let x = -offset; x < WIDTH; x += 16) g.fillRect(x, GROUND + 6, 8, 3);

      const bob = s.started ? 0 : Math.round(Math.sin(time * 4) * 3);
      const frame = s.alive ? Math.floor(time * 10) % 2 : 0;
      drawSprite(g, BIRD_FRAMES[frame], BIRD_X, Math.round((s.started ? s.y : START_Y) + bob), BIRD_COLORS, BIRD_SCALE);

      drawText(g, String(s.score), WIDTH / 2, 20, { size: 16, color: '#ffffff', align: 'center' });
      if (!s.started && Math.floor(time * 2) % 2 === 0) {
        drawText(g, 'SPACE / TAP', WIDTH / 2, HEIGHT / 2 + 30, { color: COLORS.text, align: 'center' });
      }
    },

    destroy() {
      return;
    },
  };
}
