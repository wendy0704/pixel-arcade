import { clear, COLORS, drawSprite, drawText } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import {
  aimAt,
  bossHp,
  buildWave,
  clampPlayer,
  CONFIG,
  dropsBomb,
  dropsPower,
  ENEMY,
  type EnemyKind,
  fan,
  FIRE_INTERVAL,
  HEIGHT,
  HITBOX,
  INVULNERABLE,
  isBossWave,
  LIVES,
  MAX_POWER,
  overlaps,
  PLAYER_H,
  PLAYER_SPEED,
  PLAYER_W,
  shotPattern,
  SHOT_SPEED,
  type Spawn,
  WIDTH,
} from './logic';
import { BOMB_ITEM, BOSS, DIVER, DRONE, ENEMY_COLORS, GUNSHIP, PLAYER, PLAYER_COLORS, POWER } from './sprites';

interface Enemy {
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  age: number;
  homeX: number;
  stopY: number;
  fireTimer: number;
  pattern: number;
  flash: number;
}

interface Mover {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Item {
  kind: 'power' | 'bomb';
  x: number;
  y: number;
}

interface Particle extends Mover {
  life: number;
  color: string;
}

const SPRITES: Record<EnemyKind, string[]> = { drone: DRONE, diver: DIVER, gunship: GUNSHIP, boss: BOSS };
const WAVE_GAP = 1.6;
const END_DELAY = 1.5;
const BOMB_DAMAGE = 12;

export function createGame(): Game {
  let ctx!: GameContext;
  let px = WIDTH / 2;
  let py = HEIGHT - 30;
  let shots: Mover[] = [];
  let bullets: Mover[] = [];
  let enemies: Enemy[] = [];
  let items: Item[] = [];
  let particles: Particle[] = [];
  let queue: Spawn[] = [];
  let wave = 1;
  let waveTime = 0;
  let gapTimer = 0;
  let banner = 0;
  let score = 0;
  let lives = LIVES;
  let bombs = 2;
  let power = 1;
  let kills = 0;
  let fireTimer = 0;
  let invulnerable = 0;
  let bombFlash = 0;
  let dragging = false;
  let dragStart = { x: 0, y: 0, px: 0, py: 0 };
  let endTimer = -1;
  let finished = false;
  let time = 0;
  let stars: { x: number; y: number; speed: number }[] = [];

  const cfg = () => CONFIG[ctx.difficulty];

  const burst = (x: number, y: number, count: number, color: string, speed = 70) => {
    for (let i = 0; i < count; i++) {
      const a = ctx.random() * Math.PI * 2;
      const v = speed * (0.3 + ctx.random());
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.3 + ctx.random() * 0.4, color });
    }
  };

  const enemyRect = (e: Enemy) => ({ x: e.x - ENEMY[e.kind].w / 2, y: e.y, w: ENEMY[e.kind].w, h: ENEMY[e.kind].h });
  const playerHitbox = () => ({ x: px - HITBOX / 2, y: py - HITBOX / 2 + 1, w: HITBOX, h: HITBOX });

  const startWave = () => {
    queue = buildWave(wave, ctx.random);
    waveTime = 0;
    banner = 1.6;
    if (isBossWave(wave)) ctx.audio.play('ufo');
  };

  const spawn = (s: Spawn) => {
    const info = ENEMY[s.kind];
    const hp = s.kind === 'boss' ? bossHp(wave) : info.hp;
    const rate = cfg().fireRate;
    enemies.push({
      kind: s.kind,
      x: s.x,
      y: -info.h,
      vx: 0,
      vy: s.kind === 'boss' ? 30 : s.kind === 'gunship' ? 45 : s.kind === 'diver' ? 75 : 55,
      hp,
      maxHp: hp,
      age: 0,
      homeX: s.x,
      stopY: s.kind === 'boss' ? 26 : 40 + ctx.random() * 50,
      fireTimer: s.kind === 'drone' ? (1.4 + ctx.random() * 3) / rate : (1.2 + ctx.random()) / rate,
      pattern: 0,
      flash: 0,
    });
  };

  const enemyFire = (e: Enemy) => {
    const speed = cfg().bulletSpeed;
    const cx = e.x;
    const cy = e.y + ENEMY[e.kind].h;
    const add = (v: { vx: number; vy: number }) => bullets.push({ x: cx, y: cy, ...v });
    if (e.kind === 'boss') {
      if (e.pattern % 2 === 0) fan(e.hp < e.maxHp / 2 ? 9 : 7, 1.5, Math.PI / 2, speed * 0.9).forEach(add);
      else {
        const base = Math.atan2(py - cy, px - cx);
        fan(3, 0.3, base, speed * 1.15).forEach(add);
      }
      e.pattern++;
    } else {
      add(aimAt(cx, cy, px, py, speed));
    }
  };

  const killEnemy = (e: Enemy) => {
    kills++;
    score += ENEMY[e.kind].points;
    ctx.setScore(score);
    const r = enemyRect(e);
    burst(e.x, e.y + r.h / 2, e.kind === 'boss' ? 60 : 12, e.kind === 'boss' ? COLORS.gold : COLORS.orange, e.kind === 'boss' ? 120 : 70);
    ctx.audio.play(e.kind === 'boss' ? 'boom' : 'explode');
    if (dropsPower(kills, e.kind)) items.push({ kind: 'power', x: e.x, y: e.y + r.h / 2 });
    else if (dropsBomb(kills)) items.push({ kind: 'bomb', x: e.x, y: e.y + r.h / 2 });
    if (e.kind === 'boss') bullets = [];
  };

  const damage = (e: Enemy, amount: number) => {
    e.hp -= amount;
    e.flash = 0.06;
    if (e.hp <= 0) killEnemy(e);
  };

  const playerHit = () => {
    lives--;
    burst(px, py, 30, COLORS.cyan, 100);
    ctx.audio.play('boom');
    bullets = [];
    power = Math.max(1, power - 1);
    if (lives <= 0) {
      endTimer = END_DELAY;
      return;
    }
    invulnerable = INVULNERABLE;
    bombs = Math.max(bombs, 1);
    px = WIDTH / 2;
    py = HEIGHT - 30;
  };

  const useBomb = () => {
    if (bombs <= 0) return;
    bombs--;
    bombFlash = 0.4;
    bullets = [];
    ctx.audio.play('boom');
    for (const e of enemies) if (e.y > -ENEMY[e.kind].h) damage(e, BOMB_DAMAGE);
    enemies = enemies.filter((e) => e.hp > 0);
  };

  const updateEnemy = (e: Enemy, dt: number) => {
    e.age += dt;
    if (e.flash > 0) e.flash -= dt;
    const rate = cfg().fireRate;
    if (e.kind === 'drone') {
      e.y += e.vy * dt;
      e.x = e.homeX + Math.sin(e.age * 2.6) * 18;
    } else if (e.kind === 'diver') {
      if (e.y > 50 && e.vx === 0) {
        e.vx = Math.sign(px - e.x || 1) * 60;
        e.vy = 150;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    } else if (e.kind === 'gunship') {
      if (e.age > 6) e.y += 50 * dt;
      else if (e.y < e.stopY) e.y += e.vy * dt;
    } else {
      if (e.y < e.stopY) e.y += e.vy * dt;
      else e.x = WIDTH / 2 + Math.sin(e.age * 0.7) * 70;
    }
    if (e.y < 0) return;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      if (e.kind === 'drone') {
        enemyFire(e);
        e.fireTimer = Infinity;
      } else if (e.kind === 'gunship' || e.kind === 'boss') {
        enemyFire(e);
        e.fireTimer = (e.kind === 'boss' ? 1.5 : 1.3) / rate;
      }
    }
  };

  return {
    init(context) {
      ctx = context;
      px = WIDTH / 2;
      py = HEIGHT - 30;
      shots = [];
      bullets = [];
      enemies = [];
      items = [];
      particles = [];
      wave = 1;
      gapTimer = 0;
      score = 0;
      lives = LIVES;
      bombs = cfg().bombs;
      power = 1;
      kills = 0;
      fireTimer = 0;
      invulnerable = 0;
      bombFlash = 0;
      dragging = false;
      endTimer = -1;
      finished = false;
      time = 0;
      stars = Array.from({ length: 50 }, () => ({ x: ctx.random() * WIDTH, y: ctx.random() * HEIGHT, speed: 20 + ctx.random() * 70 }));
      startWave();
    },

    update(dt) {
      time += dt;
      if (banner > 0) banner -= dt;
      if (bombFlash > 0) bombFlash -= dt;
      for (const s of stars) s.y = (s.y + s.speed * dt) % HEIGHT;
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      particles = particles.filter((p) => p.life > 0);

      if (endTimer >= 0) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          ctx.finish({ score, completed: true });
        }
        return;
      }

      const { input } = ctx;
      const dx = Number(input.isDown('right')) - Number(input.isDown('left'));
      const dy = Number(input.isDown('down')) - Number(input.isDown('up'));
      if (dx || dy) {
        const k = dx && dy ? Math.SQRT1_2 : 1;
        const p = clampPlayer(px + dx * k * PLAYER_SPEED * dt, py + dy * k * PLAYER_SPEED * dt);
        px = p.x;
        py = p.y;
      }
      if (input.wasPressed('secondary')) useBomb();
      if (invulnerable > 0) invulnerable -= dt;

      fireTimer -= dt;
      if ((input.isDown('primary') || dragging) && fireTimer <= 0) {
        fireTimer = FIRE_INTERVAL;
        for (const s of shotPattern(power)) {
          shots.push({ x: px + s.dx, y: py - PLAYER_H / 2, vx: Math.sin(s.angle) * SHOT_SPEED, vy: -Math.cos(s.angle) * SHOT_SPEED });
        }
        if (Math.floor(time / FIRE_INTERVAL) % 2 === 0) ctx.audio.play('shoot');
      }

      waveTime += dt;
      while (queue.length && queue[0].t <= waveTime) spawn(queue.shift()!);
      for (const e of enemies) updateEnemy(e, dt);

      for (const s of shots) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
      for (const b of bullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
      for (const it of items) it.y += 45 * dt;

      shots = shots.filter((s) => {
        const rect = { x: s.x - 1, y: s.y, w: 2, h: 6 };
        const target = enemies.find((e) => e.hp > 0 && e.y > -ENEMY[e.kind].h && overlaps(rect, enemyRect(e)));
        if (target) {
          damage(target, 1);
          if (target.hp > 0) ctx.audio.play('brick', 1);
          return false;
        }
        return s.y > -8 && s.x > -8 && s.x < WIDTH + 8;
      });
      enemies = enemies.filter((e) => e.hp > 0 && e.y < HEIGHT + 24 && e.x > -40 && e.x < WIDTH + 40);
      bullets = bullets.filter((b) => b.y < HEIGHT + 4 && b.y > -4 && b.x > -4 && b.x < WIDTH + 4);

      const player = { x: px - PLAYER_W / 2, y: py - PLAYER_H / 2, w: PLAYER_W, h: PLAYER_H };
      items = items.filter((it) => {
        if (overlaps(player, { x: it.x - 3, y: it.y - 3, w: 6, h: 6 })) {
          if (it.kind === 'power') {
            if (power < MAX_POWER) power++;
            else {
              score += 1000;
              ctx.setScore(score);
            }
          } else bombs++;
          ctx.audio.play('select');
          return false;
        }
        return it.y < HEIGHT + 6;
      });

      if (invulnerable <= 0) {
        const hb = playerHitbox();
        const hitBullet = bullets.some((b) => overlaps(hb, { x: b.x - 1.5, y: b.y - 1.5, w: 3, h: 3 }));
        const hitEnemy = enemies.find((e) => e.y > 0 && overlaps(hb, enemyRect(e)));
        if (hitEnemy && hitEnemy.kind !== 'boss') damage(hitEnemy, 99);
        if (hitBullet || hitEnemy) playerHit();
      }

      if (!queue.length && !enemies.length && endTimer < 0) {
        if (gapTimer <= 0) gapTimer = WAVE_GAP;
        gapTimer -= dt;
        if (gapTimer <= 0) {
          wave++;
          startWave();
        }
      }
    },

    onPointer(e: PointerInfo) {
      if (e.type === 'down') {
        dragging = true;
        dragStart = { x: e.x, y: e.y, px, py };
      } else if (e.type === 'move' && dragging) {
        const p = clampPlayer(dragStart.px + (e.x - dragStart.x), dragStart.py + (e.y - dragStart.y));
        px = p.x;
        py = p.y;
      } else if (e.type === 'up') {
        dragging = false;
      }
    },

    render() {
      const g = ctx.ctx;
      clear(g, WIDTH, HEIGHT, bombFlash > 0 ? '#3a1a3a' : '#07071a');
      for (const s of stars) {
        g.fillStyle = s.speed > 70 ? '#8888aa' : s.speed > 45 ? '#4a4a70' : '#2a2a48';
        g.fillRect(Math.round(s.x), Math.round(s.y), 1, s.speed > 70 ? 2 : 1);
      }

      for (const it of items) {
        const blink = Math.floor(time * 8) % 2 === 0;
        drawSprite(g, it.kind === 'power' ? POWER : BOMB_ITEM, Math.round(it.x - 3), Math.round(it.y - 3), blink ? ENEMY_COLORS : { ...ENEMY_COLORS, y: COLORS.orange, p: COLORS.purple });
      }

      for (const e of enemies) {
        const r = enemyRect(e);
        const colors = e.flash > 0 ? { ...ENEMY_COLORS, p: '#ffffff', o: '#ffffff', g: '#ffffff', v: '#ffffff' } : ENEMY_COLORS;
        drawSprite(g, SPRITES[e.kind], Math.round(r.x), Math.round(r.y), colors);
      }

      g.fillStyle = COLORS.gold;
      for (const s of shots) g.fillRect(Math.round(s.x) - 1, Math.round(s.y), 2, 6);

      for (const b of bullets) {
        g.fillStyle = Math.floor(time * 12) % 2 ? COLORS.pink : '#ffffff';
        g.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 3, 3);
      }

      if (endTimer < 0 && !(invulnerable > 0 && Math.floor(time * 12) % 2 === 0)) {
        const flame = Math.floor(time * 20) % 2 ? PLAYER_COLORS : { ...PLAYER_COLORS, o: COLORS.gold };
        drawSprite(g, PLAYER, Math.round(px - PLAYER_W / 2), Math.round(py - PLAYER_H / 2), flame);
        if (dragging || ctx.input.isDown('down') || ctx.input.isDown('up')) {
          g.fillStyle = '#ffffff';
          g.fillRect(Math.round(px) - 1, Math.round(py), 2, 2);
        }
      }

      for (const p of particles) {
        g.globalAlpha = Math.min(1, p.life * 3);
        g.fillStyle = p.color;
        g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
      }
      g.globalAlpha = 1;

      const boss = enemies.find((e) => e.kind === 'boss');
      if (boss) {
        g.fillStyle = COLORS.panelLight;
        g.fillRect(40, 18, WIDTH - 80, 4);
        g.fillStyle = COLORS.red;
        g.fillRect(40, 18, Math.round(((WIDTH - 80) * Math.max(0, boss.hp)) / boss.maxHp), 4);
      }

      for (let i = 0; i < lives; i++) drawSprite(g, ['.c.', 'ccc', 'c.c'], 6 + i * 6, 6, COLORS.cyan);
      for (let i = 0; i < bombs; i++) {
        g.fillStyle = COLORS.purple;
        g.fillRect(6 + i * 6, 12, 4, 4);
      }
      drawText(g, `P${power}`, WIDTH - 52, 6, { color: COLORS.gold });
      drawText(g, `W${wave}`, WIDTH - 6, 6, { color: COLORS.muted, align: 'right' });
      if (banner > 0) {
        const bossWave = isBossWave(wave);
        if (!bossWave || Math.floor(time * 6) % 2 === 0) {
          drawText(g, bossWave ? 'WARNING!' : `WAVE ${wave}`, WIDTH / 2, HEIGHT / 2 - 30, {
            size: 16,
            color: bossWave ? COLORS.red : COLORS.cyan,
            align: 'center',
          });
        }
      }
    },

    destroy() {
      return;
    },
  };
}
