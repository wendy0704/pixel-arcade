import { clear, COLORS, drawSprite, drawText } from '../../core/pixel';
import type { Game, GameContext } from '../../types/game';
import {
  ALIEN_H,
  alienRect,
  aliveBounds,
  aliveCount,
  CONFIG,
  createFormation,
  createShields,
  eraseShield,
  type Formation,
  GROUND_Y,
  HEIGHT,
  hitShield,
  LIVES,
  overlaps,
  PLAYER_H,
  PLAYER_W,
  PLAYER_Y,
  randomBetween,
  type Rect,
  ROW_POINTS,
  type Shield,
  SHIELD_CELL,
  shooters,
  stepFormation,
  stepInterval,
  ufoPoints,
  WIDTH,
} from './logic';
import { ALIEN_COLORS, ALIENS, alienType, ENEMY_BULLET, EXPLOSION, PLAYER, UFO } from './sprites';

interface Bullet {
  x: number;
  y: number;
}

interface Explosion {
  x: number;
  y: number;
  t: number;
  color: string;
  text?: string;
}

const PLAYER_SPEED = 120;
const BULLET_SPEED = 260;
const ENEMY_BULLET_SPEED = 110;
const UFO_SPEED = 60;
const UFO_Y = 30;
const UFO_W = 16;
const UFO_H = 6;

export function createGame(): Game {
  let ctx!: GameContext;
  let formation!: Formation;
  let shields: Shield[] = [];
  let playerX = WIDTH / 2 - PLAYER_W / 2;
  let playerBullet: Bullet | null = null;
  let enemyBullets: Bullet[] = [];
  let explosions: Explosion[] = [];
  let ufo: { x: number; dir: 1 | -1 } | null = null;
  let ufoTimer = 25;
  let ufoSound = 0;
  let stepTimer = 0;
  let fireTimer = 1.5;
  let respawn = 0;
  let lives = LIVES;
  let wave = 1;
  let score = 0;
  let banner = 0;
  let endTimer = -1;
  let finished = false;
  let time = 0;
  let stars: [number, number][] = [];

  const cfg = () => CONFIG[ctx.difficulty];
  const playerRect = (): Rect => ({ x: playerX, y: PLAYER_Y, w: PLAYER_W, h: PLAYER_H });
  const addScore = (n: number) => {
    score += n;
    ctx.setScore(score);
  };

  const endGame = () => {
    if (endTimer >= 0) return;
    endTimer = 1.2;
    ctx.audio.play('die');
  };

  const nextWave = () => {
    wave++;
    formation = createFormation(wave);
    shields = createShields();
    enemyBullets = [];
    playerBullet = null;
    stepTimer = 0;
    banner = 1.5;
    ctx.audio.play('clear');
  };

  const playerHit = () => {
    lives--;
    explosions.push({ x: playerX, y: PLAYER_Y, t: 1, color: COLORS.cyan });
    enemyBullets = [];
    playerBullet = null;
    if (lives <= 0) endGame();
    else {
      respawn = 1.2;
      ctx.audio.play('die');
    }
  };

  const updatePlayerBullet = (dt: number) => {
    if (!playerBullet) return;
    playerBullet.y -= BULLET_SPEED * dt;
    const r: Rect = { x: playerBullet.x, y: playerBullet.y, w: 1, h: 4 };
    if (playerBullet.y < 22) {
      playerBullet = null;
      return;
    }
    for (const a of formation.aliens) {
      if (!a.alive) continue;
      const ar = alienRect(formation, a);
      if (overlaps(r, ar)) {
        a.alive = false;
        addScore(ROW_POINTS[a.row]);
        explosions.push({ x: ar.x, y: ar.y, t: 0.25, color: ALIEN_COLORS[a.row] });
        ctx.audio.play('explode');
        playerBullet = null;
        return;
      }
    }
    if (ufo && overlaps(r, { x: ufo.x, y: UFO_Y, w: UFO_W, h: UFO_H })) {
      const pts = ufoPoints(ctx.random);
      addScore(pts);
      explosions.push({ x: ufo.x, y: UFO_Y, t: 1, color: COLORS.red, text: String(pts) });
      ctx.audio.play('explode');
      ufo = null;
      ufoTimer = randomBetween(20, 30, ctx.random);
      playerBullet = null;
      return;
    }
    for (const s of shields) {
      if (hitShield(s, r)) {
        playerBullet = null;
        return;
      }
    }
    const hitIndex = enemyBullets.findIndex((b) => overlaps(r, { x: b.x, y: b.y, w: 3, h: 6 }));
    if (hitIndex >= 0) {
      enemyBullets.splice(hitIndex, 1);
      playerBullet = null;
    }
  };

  const updateEnemyBullets = (dt: number) => {
    const speed = ENEMY_BULLET_SPEED + (wave - 1) * 10;
    const kept: Bullet[] = [];
    for (const b of enemyBullets) {
      b.y += speed * dt;
      const r: Rect = { x: b.x, y: b.y, w: 3, h: 6 };
      if (b.y > GROUND_Y) continue;
      if (shields.some((s) => hitShield(s, r))) continue;
      if (respawn <= 0 && overlaps(r, playerRect())) {
        playerHit();
        return;
      }
      kept.push(b);
    }
    enemyBullets = kept;
  };

  const updateFormation = (dt: number) => {
    stepTimer += dt;
    const interval = stepInterval(cfg().interval, aliveCount(formation));
    if (stepTimer < interval) return;
    stepTimer = 0;
    stepFormation(formation);
    for (const a of formation.aliens) {
      if (!a.alive) continue;
      const r = alienRect(formation, a);
      for (const s of shields) eraseShield(s, r);
    }
    const b = aliveBounds(formation);
    if (b && b.maxY >= PLAYER_Y) {
      lives = 0;
      explosions.push({ x: playerX, y: PLAYER_Y, t: 1, color: COLORS.cyan });
      endGame();
    }
  };

  const updateFire = (dt: number) => {
    fireTimer -= dt;
    if (fireTimer > 0) return;
    const { fireMin, fireMax, maxBullets } = cfg();
    fireTimer = randomBetween(fireMin, fireMax, ctx.random);
    if (enemyBullets.length >= maxBullets) return;
    const candidates = shooters(formation);
    if (!candidates.length) return;
    const a = candidates[Math.floor(ctx.random() * candidates.length) % candidates.length];
    const r = alienRect(formation, a);
    enemyBullets.push({ x: r.x + r.w / 2 - 1, y: r.y + ALIEN_H });
  };

  const updateUfo = (dt: number) => {
    if (!ufo) {
      ufoTimer -= dt;
      if (ufoTimer <= 0) {
        const fromLeft = ctx.random() < 0.5;
        ufo = { x: fromLeft ? -UFO_W : WIDTH, dir: fromLeft ? 1 : -1 };
      }
      return;
    }
    ufo.x += UFO_SPEED * ufo.dir * dt;
    ufoSound -= dt;
    if (ufoSound <= 0) {
      ctx.audio.play('ufo');
      ufoSound = 0.3;
    }
    if (ufo.x < -UFO_W - 2 || ufo.x > WIDTH + 2) {
      ufo = null;
      ufoTimer = randomBetween(20, 30, ctx.random);
    }
  };

  return {
    init(context) {
      ctx = context;
      formation = createFormation(1);
      shields = createShields();
      playerX = WIDTH / 2 - PLAYER_W / 2;
      playerBullet = null;
      enemyBullets = [];
      explosions = [];
      ufo = null;
      ufoTimer = randomBetween(20, 30, ctx.random);
      ufoSound = 0;
      stepTimer = 0;
      fireTimer = 1.5;
      respawn = 0;
      lives = LIVES;
      wave = 1;
      score = 0;
      banner = 0;
      endTimer = -1;
      finished = false;
      time = 0;
      stars = Array.from({ length: 40 }, () => [Math.floor(ctx.random() * WIDTH), Math.floor(24 + ctx.random() * (GROUND_Y - 40))]);
    },

    update(dt) {
      time += dt;
      if (banner > 0) banner -= dt;
      explosions = explosions.filter((e) => (e.t -= dt) > 0);
      if (endTimer >= 0) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          ctx.finish({ score, completed: true });
        }
        return;
      }
      if (respawn > 0) {
        respawn -= dt;
        if (respawn <= 0) playerX = WIDTH / 2 - PLAYER_W / 2;
        return;
      }
      const { input } = ctx;
      const dir = Number(input.isDown('right')) - Number(input.isDown('left'));
      playerX = Math.max(6, Math.min(WIDTH - 6 - PLAYER_W, playerX + dir * PLAYER_SPEED * dt));
      if ((input.wasPressed('primary') || input.wasPressed('up')) && !playerBullet) {
        playerBullet = { x: Math.round(playerX + PLAYER_W / 2 - 0.5), y: PLAYER_Y - 4 };
        ctx.audio.play('shoot');
      }
      updatePlayerBullet(dt);
      updateFormation(dt);
      if (endTimer >= 0) return;
      updateFire(dt);
      updateEnemyBullets(dt);
      updateUfo(dt);
      if (aliveCount(formation) === 0) nextWave();
    },

    render() {
      const g = ctx.ctx;
      clear(g, WIDTH, HEIGHT);
      g.fillStyle = '#2a2a48';
      for (const [x, y] of stars) g.fillRect(x, y, 1, 1);

      drawText(g, `WAVE ${wave}`, WIDTH - 6, 6, { color: COLORS.muted, align: 'right' });

      if (ufo) drawSprite(g, UFO, ufo.x, UFO_Y, { X: COLORS.red, G: COLORS.cyan });

      for (const a of formation.aliens) {
        if (!a.alive) continue;
        const r = alienRect(formation, a);
        drawSprite(g, ALIENS[alienType(a.row)][formation.frame], r.x, r.y, ALIEN_COLORS[a.row]);
      }

      g.fillStyle = COLORS.green;
      for (const s of shields) {
        for (let i = 0; i < s.cells.length; i++) {
          if (!s.cells[i]) continue;
          g.fillRect(s.x + (i % s.cols) * SHIELD_CELL, s.y + Math.floor(i / s.cols) * SHIELD_CELL, SHIELD_CELL, SHIELD_CELL);
        }
      }

      const playerVisible = respawn <= 0 && !(endTimer >= 0 && lives <= 0);
      if (playerVisible) drawSprite(g, PLAYER, playerX, PLAYER_Y, COLORS.cyan);

      if (playerBullet) {
        g.fillStyle = COLORS.gold;
        g.fillRect(playerBullet.x, Math.round(playerBullet.y), 1, 4);
      }
      const bf = Math.floor(time * 8) % 2;
      for (const b of enemyBullets) drawSprite(g, ENEMY_BULLET[bf], b.x, b.y, COLORS.pink);

      for (const e of explosions) {
        if (e.text) drawText(g, e.text, e.x + UFO_W / 2, e.y, { color: e.color, align: 'center' });
        else if (Math.floor(e.t * 16) % 2 === 0 || e.t < 0.3) drawSprite(g, EXPLOSION, e.x, e.y, e.color);
      }

      g.fillStyle = COLORS.pink;
      g.fillRect(0, GROUND_Y, WIDTH, 2);
      for (let i = 0; i < Math.max(0, lives - 1); i++) drawSprite(g, PLAYER, 8 + i * 18, GROUND_Y + 8, COLORS.cyan);
      drawText(g, String(Math.max(0, lives)), WIDTH - 8, GROUND_Y + 8, { color: COLORS.cyan, align: 'right' });

      if (banner > 0) drawText(g, `WAVE ${wave}`, WIDTH / 2, 150, { size: 16, color: COLORS.gold, align: 'center' });
    },

    destroy() {
      return;
    },
  };
}
