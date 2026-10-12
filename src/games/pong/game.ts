import { clear, COLORS, drawText } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import {
  BALL,
  clampPaddle,
  CONFIG,
  CPU_X,
  HEIGHT,
  moveToward,
  nextSpeed,
  overlapsPaddle,
  PADDLE_H,
  PADDLE_W,
  paddleBounce,
  PLAYER_X,
  POINT_SCORE,
  predictY,
  RETURN_SCORE,
  WIDTH,
  WIN_SCORE,
} from './logic';

const PLAYER_SPEED = 240;
const SERVE_DELAY = 0.9;

export function createGame(): Game {
  let ctx!: GameContext;
  let playerY = HEIGHT / 2;
  let cpuY = HEIGHT / 2;
  let ball = { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0 };
  let speed = 0;
  let playerPoints = 0;
  let cpuPoints = 0;
  let metric = 0;
  let serveTimer = SERVE_DELAY;
  let serveDir: 1 | -1 = 1;
  let cpuAim = 0;
  let endTimer = -1;
  let finished = false;
  let time = 0;

  const cfg = () => CONFIG[ctx.difficulty];
  const rerollAim = () => {
    cpuAim = (ctx.random() * 2 - 1) * cfg().cpuError;
  };

  const serve = () => {
    speed = cfg().ballSpeed;
    const angle = (ctx.random() * 2 - 1) * 0.4;
    ball = { x: WIDTH / 2, y: HEIGHT / 2, vx: serveDir * speed * Math.cos(angle), vy: speed * Math.sin(angle) };
    rerollAim();
  };

  const point = (playerScored: boolean) => {
    if (playerScored) {
      playerPoints++;
      metric += POINT_SCORE;
      ctx.setScore(metric);
      ctx.audio.play('eat');
    } else {
      cpuPoints++;
      ctx.audio.play('die');
    }
    ball = { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0 };
    if (playerPoints >= WIN_SCORE || cpuPoints >= WIN_SCORE) {
      endTimer = 1.0;
      return;
    }
    serveDir = playerScored ? 1 : -1;
    serveTimer = SERVE_DELAY;
  };

  const physics = (dt: number) => {
    const n = Math.max(1, Math.ceil((speed * dt) / 2));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      ball.x += ball.vx * h;
      ball.y += ball.vy * h;
      if (ball.y - BALL / 2 < 0) {
        ball.y = BALL / 2;
        ball.vy = Math.abs(ball.vy);
        ctx.audio.play('reveal');
      } else if (ball.y + BALL / 2 > HEIGHT) {
        ball.y = HEIGHT - BALL / 2;
        ball.vy = -Math.abs(ball.vy);
        ctx.audio.play('reveal');
      }
      if (ball.vx < 0 && overlapsPaddle(ball.x, ball.y, PLAYER_X, playerY)) {
        speed = nextSpeed(speed, cfg().ballSpeed);
        const v = paddleBounce((ball.y - playerY) / (PADDLE_H / 2), speed, 1);
        ball.vx = v.vx;
        ball.vy = v.vy;
        ball.x = PLAYER_X + PADDLE_W + BALL / 2;
        metric += RETURN_SCORE;
        ctx.setScore(metric);
        ctx.audio.play('paddle');
        rerollAim();
      } else if (ball.vx > 0 && overlapsPaddle(ball.x, ball.y, CPU_X, cpuY)) {
        speed = nextSpeed(speed, cfg().ballSpeed);
        const v = paddleBounce((ball.y - cpuY) / (PADDLE_H / 2), speed, -1);
        ball.vx = v.vx;
        ball.vy = v.vy;
        ball.x = CPU_X - BALL / 2;
        ctx.audio.play('paddle');
      }
      if (ball.x < -BALL) {
        point(false);
        return;
      }
      if (ball.x > WIDTH + BALL) {
        point(true);
        return;
      }
    }
  };

  const updateCpu = (dt: number) => {
    const { cpuSpeed, predict } = cfg();
    let target = HEIGHT / 2;
    if (ball.vx > 0) target = (predict ? predictY(ball.x, ball.y, ball.vx, ball.vy, CPU_X) : ball.y) + cpuAim;
    cpuY = moveToward(cpuY, target, cpuSpeed, dt);
  };

  return {
    init(context) {
      ctx = context;
      playerY = HEIGHT / 2;
      cpuY = HEIGHT / 2;
      ball = { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0 };
      playerPoints = 0;
      cpuPoints = 0;
      metric = 0;
      serveTimer = SERVE_DELAY;
      serveDir = -1;
      endTimer = -1;
      finished = false;
      time = 0;
    },

    update(dt) {
      time += dt;
      if (endTimer >= 0) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          ctx.finish({ score: metric, completed: true, headline: playerPoints > cpuPoints ? 'YOU WIN!' : 'GAME OVER' });
        }
        return;
      }
      const dir = Number(ctx.input.isDown('down')) - Number(ctx.input.isDown('up'));
      playerY = clampPaddle(playerY + dir * PLAYER_SPEED * dt);
      updateCpu(dt);
      if (serveTimer > 0) {
        serveTimer -= dt;
        if (serveTimer <= 0) serve();
        return;
      }
      physics(dt);
    },

    onPointer(e: PointerInfo) {
      if (e.type === 'move' || e.type === 'down') playerY = clampPaddle(e.y);
    },

    render() {
      const g = ctx.ctx;
      clear(g, WIDTH, HEIGHT);
      g.fillStyle = COLORS.panelLight;
      for (let y = 4; y < HEIGHT; y += 12) g.fillRect(WIDTH / 2 - 1, y, 2, 6);
      drawText(g, String(playerPoints), WIDTH / 4, 16, { size: 24, color: COLORS.cyan, align: 'center' });
      drawText(g, String(cpuPoints), (WIDTH * 3) / 4, 16, { size: 24, color: COLORS.pink, align: 'center' });
      drawText(g, 'YOU', WIDTH / 4, 46, { color: COLORS.muted, align: 'center' });
      drawText(g, 'NPC', (WIDTH * 3) / 4, 46, { color: COLORS.muted, align: 'center' });

      g.fillStyle = COLORS.cyan;
      g.fillRect(PLAYER_X, Math.round(playerY - PADDLE_H / 2), PADDLE_W, PADDLE_H);
      g.fillStyle = COLORS.pink;
      g.fillRect(CPU_X, Math.round(cpuY - PADDLE_H / 2), PADDLE_W, PADDLE_H);

      const waiting = serveTimer > 0 && endTimer < 0;
      if (!waiting || Math.floor(time * 6) % 2 === 0) {
        g.fillStyle = '#ffffff';
        g.fillRect(Math.round(ball.x - BALL / 2), Math.round(ball.y - BALL / 2), BALL, BALL);
      }
      drawText(g, `FIRST TO ${WIN_SCORE}`, WIDTH / 2, HEIGHT - 14, { color: COLORS.muted, align: 'center' });
    },

    destroy() {
      return;
    },
  };
}
