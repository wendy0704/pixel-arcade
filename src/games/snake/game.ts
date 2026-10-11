import { clear, COLORS, shade } from '../../core/pixel';
import type { Game, GameContext } from '../../types/game';
import { CELL, COLS, createSnake, DIRS, POINTS_PER_FOOD, queueTurn, ROWS, speedFor, step, type SnakeState } from './logic';

const END_DELAY = 0.8;

export function createGame(): Game {
  let ctx!: GameContext;
  let s!: SnakeState;
  let acc = 0;
  let time = 0;
  let endTimer = -1;
  let finished = false;

  const score = () => s.eaten * POINTS_PER_FOOD;

  return {
    init(context) {
      ctx = context;
      s = createSnake(COLS, ROWS, ctx.random);
      acc = 0;
      time = 0;
      endTimer = -1;
      finished = false;
    },

    update(dt) {
      time += dt;
      if (endTimer >= 0) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          ctx.finish({ score: score(), completed: true, headline: s.won ? 'CLEAR!' : 'GAME OVER' });
        }
        return;
      }
      for (const d of DIRS) if (ctx.input.wasPressed(d)) queueTurn(s, d);
      acc += dt;
      const interval = 1 / speedFor(ctx.difficulty, s.eaten);
      while (acc >= interval) {
        acc -= interval;
        const ev = step(s, ctx.random);
        if (ev === 'eat') {
          ctx.audio.play('eat');
          ctx.setScore(score());
        } else if (ev === 'dead' || ev === 'win') {
          ctx.audio.play(ev === 'dead' ? 'die' : 'clear');
          ctx.setScore(score());
          endTimer = END_DELAY;
          break;
        }
      }
    },

    render() {
      const g = ctx.ctx;
      clear(g, ctx.width, ctx.height);
      g.fillStyle = COLORS.panel;
      for (let y = 1; y < ROWS; y++) for (let x = 1; x < COLS; x++) g.fillRect(x * CELL - 1, y * CELL - 1, 2, 2);

      if (s.food) {
        const pulse = Math.floor(time * 4) % 2 === 0;
        const fx = s.food.x * CELL;
        const fy = s.food.y * CELL;
        g.fillStyle = pulse ? COLORS.pink : shade(COLORS.pink, 0.3);
        g.fillRect(fx + 4, fy + 2, 8, 12);
        g.fillRect(fx + 2, fy + 4, 12, 8);
        g.fillStyle = '#ffffff';
        g.fillRect(fx + 5, fy + 4, 2, 2);
      }

      const dead = !s.alive;
      const flash = dead && Math.floor(time * 10) % 2 === 0;
      const bodyColor = flash ? COLORS.red : COLORS.green;
      for (let i = s.body.length - 1; i >= 0; i--) {
        const p = s.body[i];
        const x = p.x * CELL;
        const y = p.y * CELL;
        g.fillStyle = i === 0 ? shade(bodyColor, 0.35) : bodyColor;
        g.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        g.fillStyle = shade(bodyColor, -0.35);
        g.fillRect(x + 1, y + CELL - 3, CELL - 2, 2);
        if (i > 0) {
          const prev = s.body[i - 1];
          g.fillStyle = bodyColor;
          if (prev.x !== p.x) g.fillRect(Math.min(prev.x, p.x) * CELL + CELL - 1, y + 3, 2, CELL - 8);
          if (prev.y !== p.y) g.fillRect(x + 3, Math.min(prev.y, p.y) * CELL + CELL - 1, CELL - 6, 2);
        }
      }

      const head = s.body[0];
      const hx = head.x * CELL;
      const hy = head.y * CELL;
      g.fillStyle = COLORS.bg;
      const eyes: Record<string, [number, number, number, number]> = {
        right: [10, 4, 10, 10],
        left: [4, 4, 4, 10],
        up: [4, 4, 10, 4],
        down: [4, 10, 10, 10],
      };
      const [ax, ay, bx, by] = eyes[s.dir];
      g.fillRect(hx + ax, hy + ay, 2, 2);
      g.fillRect(hx + bx, hy + by, 2, 2);
    },

    destroy() {
      return;
    },
  };
}
