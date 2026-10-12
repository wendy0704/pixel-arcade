import { clear, COLORS, drawText } from '../../core/pixel';
import type { Game, GameContext } from '../../types/game';
import {
  type Bullet,
  circlesTouch,
  createShip,
  extraLives,
  FIRE_COOLDOWN,
  fireBullet,
  HEIGHT,
  HYPER_COOLDOWN,
  LIVES,
  MAX_BULLETS,
  RESPAWN_SHIELD,
  type Rock,
  ROCK_POINTS,
  ROCK_RADIUS,
  safeSpot,
  type Ship,
  SHIP_R,
  spawnWave,
  speedScale,
  splitRock,
  stepMover,
  stepShip,
  WIDTH,
  wrappedDistance,
} from './logic';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const RESPAWN_DELAY = 1.2;
const WAVE_DELAY = 1.6;
const END_DELAY = 1.4;
const ROCK_FILL = '#1c1c34';
const ROCK_EDGE = '#a0a0c8';

export function createGame(): Game {
  let ctx!: GameContext;
  let ship: Ship = createShip();
  let rocks: Rock[] = [];
  let bullets: Bullet[] = [];
  let particles: Particle[] = [];
  let score = 0;
  let lives = LIVES;
  let wave = 1;
  let alive = true;
  let respawnTimer = 0;
  let shield = 0;
  let fireTimer = 0;
  let hyperTimer = 0;
  let waveTimer = 0;
  let banner = 0;
  let endTimer = -1;
  let finished = false;
  let time = 0;

  const burst = (x: number, y: number, count: number, color: string, speed = 60) => {
    for (let i = 0; i < count; i++) {
      const a = ctx.random() * Math.PI * 2;
      const v = speed * (0.3 + ctx.random());
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4 + ctx.random() * 0.5, color });
    }
  };

  const addScore = (points: number) => {
    const gained = extraLives(score, score + points);
    score += points;
    ctx.setScore(score);
    if (gained > 0) {
      lives += gained;
      ctx.audio.play('record');
    }
  };

  const startWave = () => {
    rocks = spawnWave(wave, ctx.difficulty, ship, ctx.random);
    banner = 1.4;
  };

  const shipDies = () => {
    alive = false;
    lives--;
    burst(ship.x, ship.y, 24, COLORS.cyan, 90);
    ctx.audio.play('boom');
    if (lives <= 0) endTimer = END_DELAY;
    else respawnTimer = RESPAWN_DELAY;
  };

  const tryRespawn = () => {
    const center = { x: WIDTH / 2, y: HEIGHT / 2 };
    if (rocks.some((r) => wrappedDistance(center, r) < ROCK_RADIUS[r.size] + 40)) return;
    ship = createShip();
    alive = true;
    shield = RESPAWN_SHIELD;
  };

  const breakRock = (index: number) => {
    const rock = rocks[index];
    rocks.splice(index, 1, ...splitRock(rock, speedScale(wave, ctx.difficulty), ctx.random));
    burst(rock.x, rock.y, 6 + (2 - rock.size) * 4, ROCK_EDGE);
    addScore(ROCK_POINTS[rock.size]);
    ctx.audio.play(rock.size === 0 ? 'boom' : 'explode');
  };

  const drawRock = (g: CanvasRenderingContext2D, rock: Rock, ox: number, oy: number) => {
    const r = ROCK_RADIUS[rock.size];
    g.beginPath();
    rock.shape.forEach((k, i) => {
      const a = rock.angle + (i / rock.shape.length) * Math.PI * 2;
      const x = Math.round(rock.x + ox + Math.cos(a) * r * k) + 0.5;
      const y = Math.round(rock.y + oy + Math.sin(a) * r * k) + 0.5;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.closePath();
    g.fillStyle = ROCK_FILL;
    g.fill();
    g.strokeStyle = ROCK_EDGE;
    g.lineWidth = 1;
    g.stroke();
  };

  const wrapOffsets = (x: number, y: number, r: number): [number, number][] => {
    const xs = [0];
    const ys = [0];
    if (x < r) xs.push(WIDTH);
    if (x > WIDTH - r) xs.push(-WIDTH);
    if (y < r) ys.push(HEIGHT);
    if (y > HEIGHT - r) ys.push(-HEIGHT);
    return xs.flatMap((ox) => ys.map((oy) => [ox, oy] as [number, number]));
  };

  return {
    init(context) {
      ctx = context;
      ship = createShip();
      bullets = [];
      particles = [];
      score = 0;
      lives = LIVES;
      wave = 1;
      alive = true;
      respawnTimer = 0;
      shield = RESPAWN_SHIELD;
      fireTimer = 0;
      hyperTimer = 0;
      waveTimer = 0;
      endTimer = -1;
      finished = false;
      time = 0;
      startWave();
    },

    update(dt) {
      time += dt;
      if (banner > 0) banner -= dt;
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      particles = particles.filter((p) => p.life > 0);
      for (const r of rocks) {
        stepMover(r, dt);
        r.angle += r.spin * dt;
      }

      if (endTimer >= 0) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          ctx.finish({ score, completed: true });
        }
        return;
      }

      const { input } = ctx;
      fireTimer -= dt;
      hyperTimer -= dt;
      if (alive) {
        if (shield > 0) shield -= dt;
        stepShip(ship, { left: input.isDown('left'), right: input.isDown('right'), thrust: input.isDown('up') }, dt);
        const wantsFire = input.wasPressed('primary') || (input.isDown('primary') && fireTimer <= 0);
        if (wantsFire && fireTimer <= 0 && bullets.length < MAX_BULLETS) {
          bullets.push(fireBullet(ship));
          fireTimer = FIRE_COOLDOWN;
          ctx.audio.play('shoot');
        }
        if (input.wasPressed('secondary') && hyperTimer <= 0) {
          burst(ship.x, ship.y, 8, COLORS.purple, 40);
          const spot = safeSpot(rocks, ctx.random);
          ship.x = spot.x;
          ship.y = spot.y;
          ship.vx = 0;
          ship.vy = 0;
          hyperTimer = HYPER_COOLDOWN;
          ctx.audio.play('ufo');
        }
      } else if (lives > 0) {
        respawnTimer -= dt;
        if (respawnTimer <= 0) tryRespawn();
      }

      for (const b of bullets) {
        stepMover(b, dt);
        b.life -= dt;
      }
      bullets = bullets.filter((b) => b.life > 0);

      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        const ri = rocks.findIndex((r) => circlesTouch(b, 1, r, ROCK_RADIUS[r.size]));
        if (ri >= 0) {
          bullets.splice(bi, 1);
          breakRock(ri);
        }
      }

      if (alive && shield <= 0) {
        const ri = rocks.findIndex((r) => circlesTouch(ship, SHIP_R - 1, r, ROCK_RADIUS[r.size] * 0.85));
        if (ri >= 0) {
          breakRock(ri);
          shipDies();
        }
      }

      if (!rocks.length && endTimer < 0) {
        if (waveTimer <= 0) waveTimer = WAVE_DELAY;
        waveTimer -= dt;
        if (waveTimer <= 0) {
          wave++;
          startWave();
          ctx.audio.play('start');
        }
      }
    },

    render() {
      const g = ctx.ctx;
      clear(g, WIDTH, HEIGHT);
      g.fillStyle = '#20203c';
      for (let i = 0; i < 40; i++) g.fillRect((i * 97) % WIDTH, (i * 61 + 13) % HEIGHT, 1, 1);

      for (const r of rocks) for (const [ox, oy] of wrapOffsets(r.x, r.y, ROCK_RADIUS[r.size] + 2)) drawRock(g, r, ox, oy);

      g.fillStyle = '#ffffff';
      for (const b of bullets) g.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 2, 2);

      for (const p of particles) {
        g.fillStyle = p.color;
        g.globalAlpha = Math.min(1, p.life * 2);
        g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      }
      g.globalAlpha = 1;

      if (alive && !(shield > 0 && Math.floor(time * 10) % 2 === 0)) {
        for (const [ox, oy] of wrapOffsets(ship.x, ship.y, SHIP_R + 3)) {
          const pt = (a: number, d: number): [number, number] => [
            Math.round(ship.x + ox + Math.cos(ship.angle + a) * d) + 0.5,
            Math.round(ship.y + oy + Math.sin(ship.angle + a) * d) + 0.5,
          ];
          const nose = pt(0, SHIP_R + 2);
          const left = pt(2.5, SHIP_R);
          const back = pt(Math.PI, SHIP_R * 0.4);
          const right = pt(-2.5, SHIP_R);
          g.beginPath();
          g.moveTo(...nose);
          g.lineTo(...left);
          g.lineTo(...back);
          g.lineTo(...right);
          g.closePath();
          g.fillStyle = '#0a3a48';
          g.fill();
          g.strokeStyle = COLORS.cyan;
          g.lineWidth = 1;
          g.stroke();
          if (ship.thrusting && Math.floor(time * 20) % 2 === 0) {
            const tail = pt(Math.PI, SHIP_R + 4 + (Math.floor(time * 30) % 3));
            g.beginPath();
            g.moveTo(...pt(2.8, SHIP_R * 0.7));
            g.lineTo(...tail);
            g.lineTo(...pt(-2.8, SHIP_R * 0.7));
            g.strokeStyle = COLORS.orange;
            g.stroke();
          }
        }
      }

      for (let i = 0; i < lives; i++) {
        const x = 8 + i * 10;
        g.fillStyle = COLORS.cyan;
        g.fillRect(x + 2, 6, 1, 2);
        g.fillRect(x + 1, 8, 3, 2);
        g.fillRect(x, 10, 5, 2);
      }
      drawText(g, `WAVE ${wave}`, WIDTH - 8, 6, { color: COLORS.gold, align: 'right' });
      if (banner > 0) drawText(g, `WAVE ${wave}`, WIDTH / 2, HEIGHT / 2 - 40, { size: 16, color: COLORS.cyan, align: 'center' });
    },

    destroy() {
      return;
    },
  };
}
