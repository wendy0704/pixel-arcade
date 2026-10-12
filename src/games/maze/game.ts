import { clear, COLORS, drawSprite, drawText } from '../../core/pixel';
import type { Action, Game, GameContext, PointerInfo } from '../../types/game';
import {
  cellAt,
  chainPoints,
  chaseTarget,
  chooseToward,
  COLS,
  CORNERS,
  createDots,
  DIRS,
  type Dir,
  DOT_POINTS,
  enemySpeed,
  EXIT,
  EYES_SPEED,
  frightTime,
  HEIGHT,
  HUD,
  LIVES,
  type Mode,
  modeAt,
  OPPOSITE,
  options,
  passable,
  PEN,
  type Persona,
  PERSONAS,
  PLAYER_SPEED,
  type Point,
  POWER_POINTS,
  RELEASE_TIMES,
  ROWS,
  startPoint,
  step,
  TILE,
  WIDTH,
} from './logic';
import { BEETLE_FRAMES, EYE_SPOTS, FRIGHT_COLOR, PERSONA_COLORS, SLIME_COLOR, SLIME_FRAMES, STAR } from './sprites';

interface Actor {
  from: Point;
  to: Point;
  t: number;
  dir: Dir | null;
}

interface Enemy extends Actor {
  persona: Persona;
  home: Point;
  state: 'pen' | 'out' | 'eyes';
  release: number;
  frightened: boolean;
  wander: Point;
  wanderTimer: number;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  t: number;
}

const DEATH_TIME = 1.4;
const CLEAR_TIME = 1.8;
const READY_TIME = 1.6;
const EAT_PAUSE = 0.45;
const EXTRA_LIFE = 10000;
const SWIPE = 12;

const pointOf = (a: Actor): Point => {
  let dx = a.to.x - a.from.x;
  if (Math.abs(dx) > 1) dx = -Math.sign(dx);
  return { x: a.from.x + dx * a.t, y: a.from.y + (a.to.y - a.from.y) * a.t };
};

const tileOf = (a: Actor): Point => (a.t < 0.5 ? a.from : a.to);

export function createGame(): Game {
  let ctx!: GameContext;
  let dots = createDots();
  let player: Actor = { from: startPoint(), to: startPoint(), t: 0, dir: null };
  let queued: Dir | null = null;
  let facing: Dir = 'left';
  let enemies: Enemy[] = [];
  let score = 0;
  let lives = LIVES;
  let level = 1;
  let modeTime = 0;
  let mode: Mode = 'scatter';
  let fright = 0;
  let chain = 0;
  let ready = READY_TIME;
  let dying = 0;
  let clearing = 0;
  let pause = 0;
  let popups: Popup[] = [];
  let swipe: { x: number; y: number } | null = null;
  let endTimer = -1;
  let finished = false;
  let time = 0;

  const addScore = (points: number) => {
    const before = score;
    score += points;
    ctx.setScore(score);
    if (Math.floor(score / EXTRA_LIFE) > Math.floor(before / EXTRA_LIFE)) {
      lives++;
      ctx.audio.play('record');
    }
  };

  const resetActors = () => {
    const s = startPoint();
    player = { from: s, to: s, t: 0, dir: null };
    queued = null;
    facing = 'left';
    enemies = PERSONAS.map((persona, i) => {
      const home = PEN[i];
      const out = i === 0;
      const at = out ? EXIT : home;
      return {
        persona,
        home,
        from: at,
        to: at,
        t: 0,
        dir: out ? 'left' : null,
        state: out ? 'out' : 'pen',
        release: RELEASE_TIMES[i],
        frightened: false,
        wander: CORNERS.wanderer,
        wanderTimer: 0,
      };
    });
    modeTime = 0;
    mode = 'scatter';
    fright = 0;
    ready = READY_TIME;
    popups = [];
  };

  const reverse = (a: Actor) => {
    if (!a.dir) return;
    if (a.from.x !== a.to.x || a.from.y !== a.to.y) {
      [a.from, a.to] = [a.to, a.from];
      a.t = 1 - a.t;
    }
    a.dir = OPPOSITE[a.dir];
  };

  const eat = (at: Point) => {
    const key = at.y * COLS + at.x;
    const kind = dots.get(key);
    if (!kind) return;
    dots.delete(key);
    if (kind === 'dot') {
      addScore(DOT_POINTS);
      ctx.audio.play('eat');
    } else {
      addScore(POWER_POINTS);
      ctx.audio.play('select');
      fright = frightTime(ctx.difficulty, level);
      chain = 0;
      for (const e of enemies) {
        if (e.state !== 'out') continue;
        e.frightened = true;
        reverse(e);
      }
    }
    if (!dots.size) {
      clearing = CLEAR_TIME;
      ctx.audio.play('clear');
    }
  };

  const movePlayer = (dt: number) => {
    if (queued && player.dir && queued === OPPOSITE[player.dir] && (player.from.x !== player.to.x || player.from.y !== player.to.y)) {
      reverse(player);
    }
    if (player.from.x === player.to.x && player.from.y === player.to.y) {
      const want = queued ?? player.dir;
      if (!want) return;
      const n = step(player.from, want);
      if (!passable(n.x, n.y)) return;
      player.dir = want;
      player.to = n;
      player.t = 0;
    }
    player.t += PLAYER_SPEED * dt;
    while (player.t >= 1) {
      player.from = player.to;
      player.t -= 1;
      eat(player.from);
      let next: Dir | null = null;
      if (queued) {
        const q = step(player.from, queued);
        if (passable(q.x, q.y)) next = queued;
      }
      if (!next && player.dir) {
        const f = step(player.from, player.dir);
        if (passable(f.x, f.y)) next = player.dir;
      }
      if (!next) {
        player.to = player.from;
        player.t = 0;
        break;
      }
      player.dir = next;
      player.to = step(player.from, next);
    }
    if (player.dir) facing = player.dir;
  };

  const targetFor = (e: Enemy): Point => {
    if (e.state === 'eyes') return EXIT;
    if (mode === 'scatter') return CORNERS[e.persona];
    return chaseTarget(e.persona, e.to, tileOf(player), facing, e.wander);
  };

  const moveEnemy = (e: Enemy, dt: number) => {
    if (e.state === 'pen') {
      e.release -= dt;
      if (e.release <= 0) {
        e.state = 'out';
        e.from = EXIT;
        e.to = EXIT;
        e.t = 0;
        e.dir = ctx.random() < 0.5 ? 'left' : 'right';
      }
      return;
    }
    if (e.persona === 'wanderer') {
      e.wanderTimer -= dt;
      if (e.wanderTimer <= 0) {
        e.wanderTimer = 2;
        e.wander = { x: Math.floor(ctx.random() * COLS), y: Math.floor(ctx.random() * ROWS) };
      }
    }
    const speed = e.state === 'eyes' ? EYES_SPEED : e.frightened ? enemySpeed(ctx.difficulty, level) * 0.55 : enemySpeed(ctx.difficulty, level);
    if (e.from.x === e.to.x && e.from.y === e.to.y) e.t = 1;
    else e.t += speed * dt;
    while (e.t >= 1) {
      e.from = e.to;
      e.t -= 1;
      if (e.state === 'eyes' && e.from.x === EXIT.x && e.from.y === EXIT.y) {
        e.state = 'pen';
        e.from = e.home;
        e.to = e.home;
        e.t = 0;
        e.release = 1.2;
        e.frightened = false;
        return;
      }
      let dir: Dir | null;
      if (e.frightened) {
        const opts = options(e.from, e.dir);
        dir = opts[Math.floor(ctx.random() * opts.length)] ?? null;
      } else {
        dir = chooseToward(e.from, e.dir, targetFor(e));
      }
      if (!dir) {
        e.to = e.from;
        e.t = 0;
        break;
      }
      e.dir = dir;
      e.to = step(e.from, dir);
    }
  };

  const collide = () => {
    const p = pointOf(player);
    for (const e of enemies) {
      if (e.state !== 'out') continue;
      const q = pointOf(e);
      const dx = Math.min(Math.abs(p.x - q.x), COLS - Math.abs(p.x - q.x));
      if (Math.hypot(dx, p.y - q.y) > 0.6) continue;
      if (e.frightened) {
        const points = chainPoints(chain);
        chain++;
        addScore(points);
        e.state = 'eyes';
        e.frightened = false;
        popups.push({ x: q.x, y: q.y, text: String(points), t: 0.9 });
        pause = EAT_PAUSE;
        ctx.audio.play('explode');
      } else {
        dying = DEATH_TIME;
        ctx.audio.play('die');
        return;
      }
    }
  };

  const px = (x: number) => Math.round(x * TILE);
  const py = (y: number) => Math.round(y * TILE + HUD);

  const drawWalls = (g: CanvasRenderingContext2D, flash: boolean) => {
    const edge = flash ? '#ffffff' : COLORS.blue;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = cellAt(x, y);
        if (c === '-') {
          g.fillStyle = COLORS.pink;
          g.fillRect(px(x), py(y) + TILE / 2 - 1, TILE, 2);
          continue;
        }
        if (c !== '#' && c !== 'x') continue;
        g.fillStyle = '#12123a';
        g.fillRect(px(x), py(y), TILE, TILE);
        if (c === 'x') continue;
        g.fillStyle = edge;
        const open = (dx: number, dy: number) => {
          const n = cellAt(x + dx, y + dy);
          return n !== '#' && n !== 'x' && !(x + dx < 0 || x + dx >= COLS);
        };
        if (open(0, -1)) g.fillRect(px(x), py(y), TILE, 1);
        if (open(0, 1)) g.fillRect(px(x), py(y) + TILE - 1, TILE, 1);
        if (open(-1, 0)) g.fillRect(px(x), py(y), 1, TILE);
        if (open(1, 0)) g.fillRect(px(x) + TILE - 1, py(y), 1, TILE);
      }
    }
  };

  const queue = (dir: Dir) => {
    queued = dir;
  };

  return {
    init(context) {
      ctx = context;
      dots = createDots();
      score = 0;
      lives = LIVES;
      level = 1;
      dying = 0;
      clearing = 0;
      pause = 0;
      endTimer = -1;
      finished = false;
      time = 0;
      resetActors();
    },

    update(dt) {
      time += dt;
      for (const p of popups) p.t -= dt;
      popups = popups.filter((p) => p.t > 0);

      if (endTimer >= 0) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          ctx.finish({ score, completed: true });
        }
        return;
      }

      const { input } = ctx;
      for (const d of DIRS) if (input.wasPressed(d as Action)) queue(d);
      if (!queued) for (const d of DIRS) if (input.isDown(d as Action)) queue(d);

      if (dying > 0) {
        dying -= dt;
        if (dying <= 0) {
          lives--;
          if (lives <= 0) endTimer = 0.6;
          else resetActors();
        }
        return;
      }
      if (clearing > 0) {
        clearing -= dt;
        if (clearing <= 0) {
          level++;
          dots = createDots();
          resetActors();
        }
        return;
      }
      if (ready > 0) {
        ready -= dt;
        return;
      }
      if (pause > 0) {
        pause -= dt;
        return;
      }

      if (fright > 0) {
        fright -= dt;
        if (fright <= 0) for (const e of enemies) e.frightened = false;
      } else {
        modeTime += dt;
        const next = modeAt(modeTime);
        if (next !== mode) {
          mode = next;
          for (const e of enemies) if (e.state === 'out') reverse(e);
        }
      }

      movePlayer(dt);
      if (clearing > 0) return;
      collide();
      if (dying > 0 || pause > 0) return;
      for (const e of enemies) moveEnemy(e, dt);
      collide();
    },

    onPointer(e: PointerInfo) {
      if (e.type === 'down') swipe = { x: e.x, y: e.y };
      else if ((e.type === 'move' || e.type === 'up') && swipe) {
        const dx = e.x - swipe.x;
        const dy = e.y - swipe.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE) {
          queue(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
          swipe = { x: e.x, y: e.y };
        }
        if (e.type === 'up') swipe = null;
      }
    },

    render() {
      const g = ctx.ctx;
      clear(g, WIDTH, HEIGHT);
      drawWalls(g, clearing > 0 && Math.floor(time * 6) % 2 === 0);

      const blink = Math.floor(time * 4) % 2 === 0;
      for (const [key, kind] of dots) {
        const x = key % COLS;
        const y = Math.floor(key / COLS);
        if (kind === 'dot') {
          g.fillStyle = '#ffd8a8';
          g.fillRect(px(x) + 5, py(y) + 5, 2, 2);
        } else if (blink || ready > 0) {
          drawSprite(g, STAR, px(x) + 1, py(y) + 1, { y: COLORS.gold });
        }
      }

      if (dying <= 0 || dying > DEATH_TIME - 0.3) {
        for (const e of enemies) {
          const p = e.state === 'pen' ? { x: e.home.x, y: e.home.y + Math.sin(time * 6 + e.home.x) * 0.15 } : pointOf(e);
          const frame = BEETLE_FRAMES[Math.floor(time * 8) % 2];
          const x = px(p.x) + 1;
          const y = py(p.y) + 1;
          if (e.state === 'eyes') {
            drawSprite(g, frame, x, y, { w: '#ffffff', k: COLORS.blue });
            continue;
          }
          const ending = e.frightened && fright < 2 && Math.floor(time * 8) % 2 === 0;
          const body = e.frightened ? (ending ? '#ffffff' : FRIGHT_COLOR) : PERSONA_COLORS[e.persona];
          drawSprite(g, frame, x, y, { b: body, l: e.frightened ? '#20208a' : '#3a2030', w: '#ffffff', k: e.frightened ? '#ffffff' : '#0b0b1a' });
        }
      }

      const pp = pointOf(player);
      if (dying > 0) {
        const k = Math.max(0, dying / DEATH_TIME);
        const size = Math.round(10 * k);
        g.fillStyle = SLIME_COLOR;
        g.fillRect(px(pp.x) + 6 - size / 2, py(pp.y) + 11 - size, size, size);
      } else {
        const moving = player.from.x !== player.to.x || player.from.y !== player.to.y;
        const frame = SLIME_FRAMES[moving ? Math.floor(time * 10) % 2 : 0];
        const x = px(pp.x) + 1;
        const y = py(pp.y) + 1;
        drawSprite(g, frame, x, y, { g: SLIME_COLOR, w: '#ffffff' });
        const ox = facing === 'left' ? 0 : facing === 'right' ? 1 : 0.5;
        const oy = facing === 'up' ? 0 : 1;
        g.fillStyle = '#0b0b1a';
        for (const s of EYE_SPOTS) g.fillRect(x + s.x + Math.round(ox), y + s.y + oy, 1, 1);
      }

      for (const p of popups) drawText(g, p.text, px(p.x) + 6, py(p.y), { color: COLORS.cyan, align: 'center' });

      drawText(g, `LV ${level}`, WIDTH - 6, 5, { color: COLORS.gold, align: 'right' });
      for (let i = 0; i < lives - 1; i++) drawSprite(g, SLIME_FRAMES[0], 6 + i * 13, 4, { g: SLIME_COLOR, w: '#ffffff' });
      if (ready > 0 && dying <= 0) drawText(g, 'READY!', WIDTH / 2, py(11) + 2, { color: COLORS.gold, align: 'center' });
    },

    destroy() {
      return;
    },
  };
}
