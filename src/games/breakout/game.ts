import { clear, COLORS, drawBevel, drawText } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import {
  BALL_R,
  ballSpeed,
  bounceVelocity,
  type Brick,
  circleRect,
  CONFIG,
  createBricks,
  HEIGHT,
  HUD,
  LIFE_BONUS,
  LIVES,
  PADDLE_H,
  PADDLE_Y,
  ROW_POINTS,
  substeps,
  WIDTH,
} from './logic';

export const ROW_COLORS = [COLORS.pink, COLORS.orange, COLORS.gold, COLORS.green, COLORS.cyan];
const KEY_SPEED = 280;

export function createGame(): Game {
  let ctx!: GameContext;
  let bricks: Brick[] = [];
  let paddleX = WIDTH / 2;
  let paddleW = 52;
  let ball = { x: 0, y: 0, vx: 0, vy: 0 };
  let served = false;
  let lives = LIVES;
  let level = 1;
  let hits = 0;
  let score = 0;
  let banner = 0;
  let endTimer = -1;
  let finished = false;
  let time = 0;

  const speed = () => ballSpeed(CONFIG[ctx.difficulty].ballSpeed, level, hits);
  const clampPaddle = (x: number) => Math.max(paddleW / 2, Math.min(WIDTH - paddleW / 2, x));

  const launch = () => {
    if (served || endTimer >= 0) return;
    served = true;
    const v = bounceVelocity((ctx.random() - 0.5) * 0.6, speed());
    ball.vx = v.vx;
    ball.vy = v.vy;
    ctx.audio.play('paddle');
  };

  const normalize = () => {
    const s = speed();
    const len = Math.hypot(ball.vx, ball.vy) || 1;
    ball.vx = (ball.vx / len) * s;
    ball.vy = (ball.vy / len) * s;
  };

  const loseLife = () => {
    lives--;
    served = false;
    ctx.audio.play('die');
    if (lives <= 0) endTimer = 0.8;
  };

  const levelClear = () => {
    score += lives * LIFE_BONUS;
    ctx.setScore(score);
    level++;
    hits = 0;
    bricks = createBricks();
    served = false;
    banner = 1.5;
    ctx.audio.play('clear');
  };

  const physics = (dt: number) => {
    const n = substeps(speed(), dt);
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      ball.x += ball.vx * h;
      ball.y += ball.vy * h;
      if (ball.x - BALL_R < 0) {
        ball.x = BALL_R;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x + BALL_R > WIDTH) {
        ball.x = WIDTH - BALL_R;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y - BALL_R < HUD) {
        ball.y = HUD + BALL_R;
        ball.vy = Math.abs(ball.vy);
      }
      const circle = { x: ball.x, y: ball.y, r: BALL_R };
      if (ball.vy > 0 && circleRect(circle, { x: paddleX - paddleW / 2, y: PADDLE_Y, w: paddleW, h: PADDLE_H })) {
        hits++;
        const v = bounceVelocity((ball.x - paddleX) / (paddleW / 2), speed());
        ball.vx = v.vx;
        ball.vy = v.vy;
        ball.y = PADDLE_Y - BALL_R;
        ctx.audio.play('paddle');
        continue;
      }
      for (const b of bricks) {
        if (!b.alive) continue;
        const hit = circleRect(circle, b);
        if (!hit) continue;
        b.alive = false;
        hits++;
        score += ROW_POINTS[b.row];
        ctx.setScore(score);
        ctx.audio.play('brick', 4 - b.row);
        if (hit.nx) ball.vx = Math.abs(ball.vx) * hit.nx;
        if (hit.ny) ball.vy = Math.abs(ball.vy) * hit.ny;
        normalize();
        break;
      }
      if (ball.y - BALL_R > HEIGHT) {
        loseLife();
        return;
      }
      if (bricks.every((b) => !b.alive)) {
        levelClear();
        return;
      }
    }
  };

  return {
    init(context) {
      ctx = context;
      paddleW = CONFIG[ctx.difficulty].paddleWidth;
      bricks = createBricks();
      paddleX = WIDTH / 2;
      served = false;
      lives = LIVES;
      level = 1;
      hits = 0;
      score = 0;
      banner = 0;
      endTimer = -1;
      finished = false;
      time = 0;
    },

    update(dt) {
      time += dt;
      if (banner > 0) banner -= dt;
      if (endTimer >= 0) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          ctx.finish({ score, completed: true });
        }
        return;
      }
      const { input } = ctx;
      const dir = Number(input.isDown('right')) - Number(input.isDown('left'));
      paddleX = clampPaddle(paddleX + dir * KEY_SPEED * dt);
      if (input.wasPressed('primary') || input.wasPressed('up')) launch();
      if (!served) {
        ball = { x: paddleX, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0 };
        return;
      }
      physics(dt);
    },

    onPointer(e: PointerInfo) {
      if (e.type === 'move' || e.type === 'down') paddleX = clampPaddle(e.x);
      if (e.type === 'down') launch();
    },

    render() {
      const g = ctx.ctx;
      clear(g, WIDTH, HEIGHT);
      g.fillStyle = COLORS.panel;
      g.fillRect(0, 0, WIDTH, HUD);
      g.fillStyle = COLORS.panelLight;
      g.fillRect(0, HUD - 2, WIDTH, 2);
      for (let i = 0; i < lives; i++) {
        g.fillStyle = COLORS.text;
        g.fillRect(6 + i * 16, 9, 12, 4);
      }
      drawText(g, `LV ${level}`, WIDTH - 6, 8, { color: COLORS.gold, align: 'right' });

      for (const b of bricks) if (b.alive) drawBevel(g, b.x, b.y, b.w, b.h, ROW_COLORS[b.row], 2);

      drawBevel(g, Math.round(paddleX - paddleW / 2), PADDLE_Y, paddleW, PADDLE_H, COLORS.text, 2);
      if (lives > 0) {
        g.fillStyle = '#ffffff';
        g.fillRect(Math.round(ball.x - BALL_R), Math.round(ball.y - BALL_R), BALL_R * 2, BALL_R * 2);
      }

      if (!served && endTimer < 0 && Math.floor(time * 2) % 2 === 0) {
        drawText(g, 'SPACE / TAP', WIDTH / 2, 260, { color: COLORS.muted, align: 'center' });
      }
      if (banner > 0) drawText(g, `LEVEL ${level}`, WIDTH / 2, 200, { size: 16, color: COLORS.cyan, align: 'center' });
    },

    destroy() {
      return;
    },
  };
}
