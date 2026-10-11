import { COLORS, drawSprite, drawText } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import { createRunner, DUCK_H, GROUND, HEIGHT, RUN_H, RUNNER_X, scoreOf, stepRunner, WIDTH, type RunnerState } from './logic';
import { BAT_FRAMES, CACTUS_L, CACTUS_S, DUCK_FRAME, RUN_FRAMES, RUNNER_COLORS } from './sprites';

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
      g.fillStyle = COLORS.bg;
      g.fillRect(0, 0, WIDTH, HEIGHT);

      const far = (s.distance * 0.25) % (WIDTH * 2);
      g.fillStyle = '#1a1a36';
      for (const hill of hills) {
        let x = hill.x - far;
        if (x + hill.w < 0) x += WIDTH * 2;
        g.fillRect(Math.round(x), GROUND - hill.h, hill.w, hill.h);
      }

      g.fillStyle = COLORS.panelLight;
      g.fillRect(0, GROUND, WIDTH, 1);
      g.fillStyle = COLORS.muted;
      const offset = Math.round(s.distance) % 24;
      for (let x = -offset; x < WIDTH; x += 24) {
        g.fillRect(x, GROUND + 5, 3, 1);
        g.fillRect(x + 11, GROUND + 11, 2, 1);
      }

      for (const o of s.obstacles) {
        const x = Math.round(o.x);
        if (o.kind === 'cactusS') drawSprite(g, CACTUS_S, x, o.y, { g: COLORS.green });
        else if (o.kind === 'cactusL') drawSprite(g, CACTUS_L, x, o.y, { g: COLORS.green });
        else if (o.kind === 'cluster') {
          drawSprite(g, CACTUS_S, x, o.y, { g: COLORS.green });
          drawSprite(g, CACTUS_S, x + 7, o.y, { g: COLORS.green });
          drawSprite(g, CACTUS_S, x + 14, o.y, { g: COLORS.green });
        } else {
          drawSprite(g, BAT_FRAMES[Math.floor(time * 8) % 2], x, o.y, { b: COLORS.pink, w: '#ffffff' });
        }
      }

      const blink = !s.alive && Math.floor(time * 12) % 2 === 0;
      const colors = blink ? { ...RUNNER_COLORS, c: COLORS.red } : RUNNER_COLORS;
      if (s.ducking) drawSprite(g, DUCK_FRAME, RUNNER_X, Math.round(s.feet - DUCK_H), colors);
      else {
        const frame = s.onGround && s.started && s.alive ? Math.floor(s.distance / 12) % 2 : 0;
        drawSprite(g, RUN_FRAMES[frame], RUNNER_X, Math.round(s.feet - RUN_H), colors);
      }

      drawText(g, String(scoreOf(s)).padStart(5, '0'), WIDTH - 8, 8, { color: COLORS.text, align: 'right' });
      if (!s.started && Math.floor(time * 2) % 2 === 0) {
        drawText(g, 'SPACE / TAP TO RUN', WIDTH / 2, 70, { color: COLORS.text, align: 'center' });
      }
    },

    destroy() {
      return;
    },
  };
}
