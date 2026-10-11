import { COLORS, drawSprite, drawText, mixColor } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import { createRunner, DUCK_H, GROUND, HEIGHT, nightAmount, RUN_H, RUNNER_X, scoreOf, stepRunner, WIDTH, type RunnerState } from './logic';
import { BAT_FRAMES, CACTUS_L, CACTUS_S, DAY, DUCK_FRAME, MOON, NIGHT, RUN_FRAMES, RUNNER_COLORS, SUN } from './sprites';

const END_DELAY = 0.8;

export function createGame(): Game {
  let ctx!: GameContext;
  let s!: RunnerState;
  let time = 0;
  let endTimer = -1;
  let finished = false;
  let tapJump = false;
  let tapHeld = false;
  let lastScore = 0;
  let hills: { x: number; w: number; h: number }[] = [];
  let stars: { x: number; y: number; twinkle: number }[] = [];

  return {
    init(context) {
      ctx = context;
      s = createRunner(ctx.difficulty);
      time = 0;
      endTimer = -1;
      finished = false;
      tapJump = false;
      tapHeld = false;
      lastScore = 0;
      stars = Array.from({ length: 28 }, () => ({
        x: Math.floor(ctx.random() * WIDTH * 2),
        y: 6 + Math.floor(ctx.random() * 100),
        twinkle: ctx.random() * Math.PI * 2,
      }));
      hills = [];
      for (let x = 0; x < WIDTH * 2; ) {
        const w = 40 + Math.floor(ctx.random() * 60);
        hills.push({ x, w, h: 12 + Math.floor(ctx.random() * 26) });
        x += w;
      }
    },

    update(dt) {
      time += dt;
      if (endTimer >= 0) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          ctx.finish({ score: scoreOf(s), completed: true });
        }
        return;
      }
      const { input } = ctx;
      const ev = stepRunner(
        s,
        dt,
        {
          jumpPressed: input.wasPressed('primary') || input.wasPressed('up') || tapJump,
          jumpHeld: input.isDown('primary') || input.isDown('up') || tapHeld,
          duckHeld: input.isDown('down'),
        },
        ctx.difficulty,
        ctx.random,
      );
      tapJump = false;
      if (ev.jumped) ctx.audio.play('paddle');
      if (ev.milestone) ctx.audio.play('select');
      const score = scoreOf(s);
      if (score !== lastScore) {
        lastScore = score;
        ctx.setScore(score);
      }
      if (ev.died) {
        ctx.audio.play('die');
        endTimer = END_DELAY;
      }
    },

    onPointer(e: PointerInfo) {
      if (e.type === 'down') {
        tapJump = true;
        tapHeld = true;
      } else if (e.type === 'up') {
        tapHeld = false;
      }
    },

    render() {
      const g = ctx.ctx;
      const night = nightAmount(scoreOf(s));
      const pal = (key: keyof typeof DAY) => mixColor(DAY[key], NIGHT[key], night);
      g.fillStyle = pal('sky');
      g.fillRect(0, 0, WIDTH, HEIGHT);

      if (night < 1) {
        g.globalAlpha = 1 - night;
        drawSprite(g, SUN, WIDTH - 60, 22 + Math.round(night * 90), { s: COLORS.gold });
        g.globalAlpha = 1;
      }
      if (night > 0) {
        g.globalAlpha = night;
        const drift = (s.distance * 0.03) % (WIDTH * 2);
        for (const star of stars) {
          let x = star.x - drift;
          if (x < 0) x += WIDTH * 2;
          if (x >= WIDTH) continue;
          g.fillStyle = Math.sin(time * 3 + star.twinkle) > 0.6 ? '#ffffff' : '#6a6aa0';
          g.fillRect(Math.round(x), star.y, 1, 1);
        }
        drawSprite(g, MOON, WIDTH - 120, 22 + Math.round((1 - night) * 90), { m: '#f4f1d0' });
        g.globalAlpha = 1;
      }

      const far = (s.distance * 0.25) % (WIDTH * 2);
      g.fillStyle = pal('hill');
      for (const hill of hills) {
        let x = hill.x - far;
        if (x + hill.w < 0) x += WIDTH * 2;
        g.fillRect(Math.round(x), GROUND - hill.h, hill.w, hill.h);
      }

      g.fillStyle = pal('line');
      g.fillRect(0, GROUND, WIDTH, 1);
      g.fillStyle = pal('dots');
      const offset = Math.round(s.distance) % 24;
      for (let x = -offset; x < WIDTH; x += 24) {
        g.fillRect(x, GROUND + 5, 3, 1);
        g.fillRect(x + 11, GROUND + 11, 2, 1);
      }

      const cactus = pal('cactus');
      for (const o of s.obstacles) {
        const x = Math.round(o.x);
        if (o.kind === 'cactusS') drawSprite(g, CACTUS_S, x, o.y, { g: cactus });
        else if (o.kind === 'cactusL') drawSprite(g, CACTUS_L, x, o.y, { g: cactus });
        else if (o.kind === 'cluster') {
          drawSprite(g, CACTUS_S, x, o.y, { g: cactus });
          drawSprite(g, CACTUS_S, x + 7, o.y, { g: cactus });
          drawSprite(g, CACTUS_S, x + 14, o.y, { g: cactus });
        } else {
          drawSprite(g, BAT_FRAMES[Math.floor(time * 8) % 2], x, o.y, { b: pal('bat'), w: '#ffffff' });
        }
      }

      const blink = !s.alive && Math.floor(time * 12) % 2 === 0;
      const colors = { ...RUNNER_COLORS, c: blink ? COLORS.red : pal('runner') };
      if (s.ducking) drawSprite(g, DUCK_FRAME, RUNNER_X, Math.round(s.feet - DUCK_H), colors);
      else {
        const frame = s.onGround && s.started && s.alive ? Math.floor(s.distance / 12) % 2 : 0;
        drawSprite(g, RUN_FRAMES[frame], RUNNER_X, Math.round(s.feet - RUN_H), colors);
      }

      drawText(g, String(scoreOf(s)).padStart(5, '0'), WIDTH - 8, 8, { color: pal('text'), align: 'right' });
      if (!s.started && Math.floor(time * 2) % 2 === 0) {
        drawText(g, 'SPACE / TAP TO RUN', WIDTH / 2, 70, { color: pal('text'), align: 'center' });
      }
    },

    destroy() {
      return;
    },
  };
}
