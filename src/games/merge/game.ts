import { clear, COLORS, drawText } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import { canMove, createGrid, DIRS, type Dir, type Grid, move, SIZE, spawnTile, TARGET, tileLayout, type TileMove } from './logic';
import { drawTile } from './tiles';

const SLIDE_TIME = 0.1;
const POP_TIME = 0.15;
const SWIPE_MIN = 16;

export function createGame(): Game {
  let ctx!: GameContext;
  let n = 4;
  let layout = tileLayout(4);
  let grid: Grid = createGrid(4);
  let score = 0;
  let slide: { t: number; moves: TileMove[] } | null = null;
  let pops: { r: number; c: number; t: number }[] = [];
  let pending: Dir | null = null;
  let reached = false;
  let banner = 0;
  let endTimer = -1;
  let finished = false;
  let swipeStart: { x: number; y: number } | null = null;

  const pos = (i: number) => layout.gap + i * (layout.tile + layout.gap);

  const apply = (dir: Dir) => {
    const result = move(grid, dir);
    if (!result.moved) return;
    grid = result.grid;
    score += result.gained;
    ctx.setScore(score);
    slide = { t: 0, moves: result.moves };
    pops = result.moves.filter((m) => m.merged).map((m) => ({ r: m.toR, c: m.toC, t: 0 }));
    const spawned = spawnTile(grid, ctx.random);
    if (spawned) pops.push({ r: spawned.r, c: spawned.c, t: -SLIDE_TIME });
    ctx.audio.play(result.gained > 0 ? 'line' : 'move');
    if (!reached && grid.flat().some((v) => v >= TARGET)) {
      reached = true;
      banner = 2;
      ctx.audio.play('record');
    }
    if (!canMove(grid)) {
      endTimer = 1.2;
      ctx.audio.play('die');
    }
  };

  return {
    init(context) {
      ctx = context;
      n = SIZE[ctx.difficulty];
      layout = tileLayout(n);
      grid = createGrid(n);
      score = 0;
      slide = null;
      pops = [];
      pending = null;
      reached = false;
      banner = 0;
      endTimer = -1;
      finished = false;
      swipeStart = null;
      for (let i = 0; i < 2; i++) {
        const t = spawnTile(grid, ctx.random);
        if (t) pops.push({ r: t.r, c: t.c, t: 0 });
      }
    },

    update(dt) {
      if (banner > 0) banner -= dt;
      pops = pops.filter((p) => (p.t += dt) < POP_TIME);
      if (slide) {
        slide.t += dt;
        if (slide.t >= SLIDE_TIME) slide = null;
      }
      if (endTimer >= 0) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          ctx.finish({ score, completed: true, headline: reached ? 'CLEAR!' : 'GAME OVER' });
        }
        return;
      }
      for (const d of DIRS) if (ctx.input.wasPressed(d)) pending = d;
      if (pending && !slide) {
        const d = pending;
        pending = null;
        apply(d);
      }
    },

    onPointer(e: PointerInfo) {
      if (e.type === 'down') swipeStart = { x: e.x, y: e.y };
      if (e.type !== 'up' || !swipeStart) return;
      const dx = e.x - swipeStart.x;
      const dy = e.y - swipeStart.y;
      swipeStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
      pending = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    },

    render() {
      const g = ctx.ctx;
      clear(g, ctx.width, ctx.height, COLORS.panel);
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          g.fillStyle = COLORS.bg;
          g.fillRect(pos(c), pos(r), layout.tile, layout.tile);
        }
      }
      if (slide) {
        const k = Math.min(1, slide.t / SLIDE_TIME);
        for (const m of slide.moves) {
          const x = pos(m.fromC) + (pos(m.toC) - pos(m.fromC)) * k;
          const y = pos(m.fromR) + (pos(m.toR) - pos(m.fromR)) * k;
          drawTile(g, m.value, x, y, layout.tile);
        }
      } else {
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            const v = grid[r][c];
            if (!v) continue;
            const pop = pops.find((p) => p.r === r && p.c === c);
            let scale = 1;
            if (pop) {
              const k = Math.max(0, pop.t) / POP_TIME;
              scale = pop.t < 0 ? 0 : k < 0.5 ? 0.6 + k * 1.0 : 1.1 - (k - 0.5) * 0.2;
            }
            if (scale > 0) drawTile(g, v, pos(c), pos(r), layout.tile, scale);
          }
        }
      }
      if (banner > 0 && Math.floor(banner * 4) % 2 === 0) {
        drawText(g, String(TARGET), ctx.width / 2, ctx.height / 2 - 8, { size: 16, color: COLORS.gold, align: 'center', baseline: 'middle' });
        drawText(g, 'KEEP GOING!', ctx.width / 2, ctx.height / 2 + 12, { color: COLORS.text, align: 'center', baseline: 'middle' });
      }
    },

    destroy() {
      return;
    },
  };
}
