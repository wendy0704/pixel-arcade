import { clear, COLORS, drawBevel, drawText } from '../../core/pixel';
import type { Game, GameContext, PointerInfo } from '../../types/game';
import {
  CAPACITY,
  cloneTubes,
  CONFIG,
  EXTRA_PENALTY,
  generateLevel,
  hasMoves,
  isComplete,
  isSolved,
  pourAmount,
  top,
  type Tube,
} from './logic';
import { drawTube, LIQUIDS, TUBE, tubeHeight } from './tubes';

export const WIDTH = 240;
export const HEIGHT = 330;
const ROW_Y = [44, 160];
const LIFT = 10;
const STEP = 0.08;
const END_DELAY = 1.6;
const BUTTON_Y = 290;
const BUTTON_H = 28;
const MAX_SLOT = 34;

type ButtonId = 'undo' | 'reset' | 'extra';

const BUTTONS: { id: ButtonId; x: number; w: number }[] = [
  { id: 'undo', x: 8, w: 72 },
  { id: 'reset', x: 84, w: 72 },
  { id: 'extra', x: 160, w: 72 },
];

interface Slot {
  x: number;
  y: number;
  w: number;
}

export function layout(count: number): Slot[] {
  const perRow = Math.ceil(count / 2);
  const w = Math.min(MAX_SLOT, Math.floor((WIDTH - 8) / perRow));
  return Array.from({ length: count }, (_, i) => {
    const row = i < perRow ? 0 : 1;
    const inRow = row === 0 ? perRow : count - perRow;
    const col = row === 0 ? i : i - perRow;
    const start = (WIDTH - inRow * w) / 2;
    return { x: Math.round(start + col * w + w / 2), y: ROW_Y[row], w };
  });
}

type Hit = { kind: 'tube'; index: number } | { kind: 'button'; id: ButtonId };

interface Snapshot {
  tubes: Tube[];
  moves: number;
}

interface Pouring {
  from: number;
  to: number;
  color: number;
  left: number;
  timer: number;
}

export function createGame(): Game {
  let ctx!: GameContext;
  let initial: Tube[] = [];
  let tubes: Tube[] = [];
  let slots: Slot[] = [];
  let history: Snapshot[] = [];
  let moves = 0;
  let undosLeft = 0;
  let extraUsed = false;
  let selected = -1;
  let cursor = 0;
  let showCursor = false;
  let pouring: Pouring | null = null;
  let pending: Hit | null = null;
  let shake = { index: -1, time: 0 };
  let flash = { index: -1, time: 0 };
  let won = false;
  let endTimer = -1;
  let finished = false;
  let time = 0;

  const score = () => moves + (extraUsed ? EXTRA_PENALTY : 0);
  const unlimited = () => undosLeft >= 99;

  const relayout = () => {
    slots = layout(tubes.length);
    cursor = Math.min(cursor, tubes.length - 1);
  };

  const finishPour = () => {
    if (!pouring) return;
    const { to } = pouring;
    pouring = null;
    if (isComplete(tubes[to])) {
      flash = { index: to, time: 0.6 };
      ctx.audio.play('line');
    } else ctx.audio.play('lock');
    if (isSolved(tubes)) {
      won = true;
      selected = -1;
      endTimer = END_DELAY;
      ctx.audio.play('clear');
    }
  };

  const startPour = (from: number, to: number) => {
    const amount = pourAmount(tubes, from, to);
    if (!amount) {
      shake = { index: to, time: 0.25 };
      ctx.audio.play('flag');
      return false;
    }
    history.push({ tubes: cloneTubes(tubes), moves });
    moves++;
    ctx.setScore(score());
    pouring = { from, to, color: top(tubes[from]), left: amount, timer: STEP };
    selected = -1;
    return true;
  };

  const choose = (index: number) => {
    if (won || pouring) return;
    cursor = index;
    if (selected < 0) {
      if (!tubes[index].length || isComplete(tubes[index])) {
        shake = { index, time: 0.25 };
        ctx.audio.play('flag');
        return;
      }
      selected = index;
      ctx.audio.play('select');
      return;
    }
    if (selected === index) {
      selected = -1;
      ctx.audio.play('move');
      return;
    }
    if (!startPour(selected, index) && tubes[index].length && !isComplete(tubes[index])) {
      selected = index;
    }
  };

  const undo = () => {
    if (won || pouring) return;
    const last = history.at(-1);
    if (!last || undosLeft <= 0) {
      ctx.audio.play('flag');
      return;
    }
    history.pop();
    tubes = last.tubes;
    moves = last.moves;
    if (!unlimited()) undosLeft--;
    selected = -1;
    ctx.setScore(score());
    ctx.audio.play('move');
  };

  const reset = () => {
    if (won || pouring) return;
    tubes = cloneTubes(initial);
    if (extraUsed) tubes.push([]);
    history = [];
    moves = 0;
    selected = -1;
    relayout();
    ctx.setScore(score());
    ctx.audio.play('start');
  };

  const addTube = () => {
    if (won || pouring || extraUsed) {
      ctx.audio.play('flag');
      return;
    }
    extraUsed = true;
    tubes.push([]);
    history.forEach((h) => h.tubes.push([]));
    relayout();
    ctx.setScore(score());
    ctx.audio.play('reveal');
  };

  const press = (id: ButtonId) => {
    if (id === 'undo') undo();
    else if (id === 'reset') reset();
    else addTube();
  };

  const hitTest = (x: number, y: number): Hit | null => {
    if (y >= BUTTON_Y && y < BUTTON_Y + BUTTON_H) {
      const b = BUTTONS.find((btn) => x >= btn.x && x < btn.x + btn.w);
      return b ? { kind: 'button', id: b.id } : null;
    }
    const h = tubeHeight();
    const index = slots.findIndex((s) => Math.abs(x - s.x) <= s.w / 2 && y >= s.y - LIFT - 6 && y <= s.y + h + 8);
    return index >= 0 ? { kind: 'tube', index } : null;
  };

  const moveCursor = (dx: number, dy: number) => {
    const perRow = Math.ceil(tubes.length / 2);
    const row = cursor < perRow ? 0 : 1;
    let col = row === 0 ? cursor : cursor - perRow;
    let nextRow = row;
    if (dy) nextRow = Math.min(1, Math.max(0, row + dy));
    const inRow = nextRow === 0 ? perRow : tubes.length - perRow;
    col = Math.min(inRow - 1, Math.max(0, col + dx));
    cursor = nextRow === 0 ? col : perRow + col;
    showCursor = true;
    ctx.audio.play('move');
  };

  return {
    init(context) {
      ctx = context;
      const config = CONFIG[ctx.difficulty];
      initial = generateLevel(config, ctx.random);
      tubes = cloneTubes(initial);
      history = [];
      moves = 0;
      undosLeft = config.undos;
      extraUsed = false;
      selected = -1;
      cursor = 0;
      showCursor = false;
      pouring = null;
      pending = null;
      shake = { index: -1, time: 0 };
      flash = { index: -1, time: 0 };
      won = false;
      endTimer = -1;
      finished = false;
      time = 0;
      relayout();
      ctx.setScore(0);
    },

    update(dt) {
      time += dt;
      if (shake.time > 0) shake.time -= dt;
      if (flash.time > 0) flash.time -= dt;
      if (pouring) {
        pouring.timer -= dt;
        while (pouring && pouring.timer <= 0) {
          tubes[pouring.to].push(tubes[pouring.from].pop()!);
          pouring.left--;
          pouring.timer += STEP;
          if (pouring.left <= 0) finishPour();
        }
        return;
      }
      if (won) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          ctx.finish({ score: score(), completed: true, headline: 'SORTED!' });
        }
        return;
      }
      const { input } = ctx;
      if (input.wasPressed('left')) moveCursor(-1, 0);
      if (input.wasPressed('right')) moveCursor(1, 0);
      if (input.wasPressed('up')) moveCursor(0, -1);
      if (input.wasPressed('down')) moveCursor(0, 1);
      if (input.wasPressed('primary')) {
        showCursor = true;
        choose(cursor);
      }
      if (input.wasPressed('secondary')) undo();
    },

    onKey(key: string) {
      if (key === 'Backspace' || key === 'u' || key === 'U') {
        undo();
        return true;
      }
      if (key === 'r' || key === 'R') {
        reset();
        return true;
      }
      if (key === 't' || key === 'T') {
        addTube();
        return true;
      }
      return false;
    },

    onPointer(e: PointerInfo) {
      if (e.type === 'move' && e.pointerType === 'mouse') {
        showCursor = false;
        return;
      }
      if (e.type !== 'down' && e.type !== 'up') return;
      const hit = hitTest(e.x, e.y);
      if (e.type === 'down') {
        pending = hit;
        return;
      }
      const start = pending;
      pending = null;
      if (!hit || !start || hit.kind !== start.kind) return;
      if (hit.kind === 'tube' && start.kind === 'tube' && hit.index === start.index) choose(hit.index);
      if (hit.kind === 'button' && start.kind === 'button' && hit.id === start.id) press(hit.id);
    },

    render() {
      const g = ctx.ctx;
      clear(g, WIDTH, HEIGHT);
      drawText(g, `MOVES ${moves}`, 8, 10, { color: COLORS.text });
      if (extraUsed) drawText(g, `+${EXTRA_PENALTY}`, 8 + (String(moves).length + 6) * 8 + 4, 10, { color: COLORS.red });
      drawText(g, `${new Set(initial.flat()).size} COLORS`, WIDTH - 8, 10, { color: COLORS.muted, align: 'right' });

      const h = tubeHeight();
      const lifted = (i: number) => (i === selected || (pouring && pouring.from === i) ? LIFT : 0);
      tubes.forEach((tube, i) => {
        const s = slots[i];
        let x = s.x;
        if (shake.index === i && shake.time > 0) x += Math.round(Math.sin(shake.time * 60) * 2);
        const y = s.y - lifted(i);
        const done = isComplete(tube);
        const glow = flash.index === i && flash.time > 0 && Math.floor(flash.time * 12) % 2 === 0;
        drawTube(g, tube, x, y, { rim: glow ? COLORS.gold : i === selected ? COLORS.cyan : undefined, corked: done });
        if (showCursor && i === cursor && !won) {
          g.fillStyle = COLORS.pink;
          const cy = s.y + h + 8;
          g.fillRect(x - 1, cy, 3, 1);
          g.fillRect(x - 2, cy + 1, 5, 1);
          g.fillRect(x - 3, cy + 2, 7, 1);
        }
      });

      if (pouring) {
        const a = slots[pouring.from];
        const b = slots[pouring.to];
        const sx = a.x;
        const sy = a.y - LIFT - 2;
        const tx = b.x;
        const ty = b.y + TUBE.mouth + (CAPACITY - tubes[pouring.to].length) * TUBE.segment;
        const peak = Math.min(sy, b.y) - 18;
        g.fillStyle = LIQUIDS[pouring.color % LIQUIDS.length];
        for (let k = 0; k <= 24; k++) {
          const t = k / 24;
          const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * ((sx + tx) / 2) + t * t * tx;
          const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * peak + t * t * b.y;
          g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
        }
        g.fillRect(tx - 1, b.y, 3, Math.max(0, ty - b.y));
      }

      const stuck = !won && !pouring && !hasMoves(tubes);
      if (won) drawText(g, 'SORTED!', WIDTH / 2, 268, { color: COLORS.cyan, align: 'center' });
      else if (stuck) drawText(g, 'NO MOVES - UNDO OR RESET', WIDTH / 2, 268, { color: COLORS.red, align: 'center' });
      else if (selected >= 0) drawText(g, 'POUR INTO...', WIDTH / 2, 268, { color: COLORS.muted, align: 'center' });

      BUTTONS.forEach(({ id, x, w }) => {
        const disabled =
          (id === 'undo' && (!history.length || undosLeft <= 0)) || (id === 'extra' && extraUsed) || won;
        drawBevel(g, x, BUTTON_Y, w, BUTTON_H, disabled ? COLORS.panel : id === 'extra' ? '#4a4a80' : COLORS.panelLight, 2);
        const label = id === 'undo' ? (unlimited() ? 'UNDO' : `UNDO ${undosLeft}`) : id === 'reset' ? 'RESET' : '+TUBE';
        drawText(g, label, x + w / 2, BUTTON_Y + BUTTON_H / 2 + 1, {
          color: disabled ? COLORS.muted : COLORS.text,
          align: 'center',
          baseline: 'middle',
        });
      });
    },

    destroy() {
      return;
    },
  };
}
