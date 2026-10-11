import { clear, COLORS, drawBevel, drawText } from '../../core/pixel';
import type { Game, GameContext } from '../../types/game';
import {
  ARR,
  type Board,
  cells,
  clearLines,
  collides,
  COLS,
  createBag,
  createBoard,
  DAS,
  dropDistance,
  fullRows,
  gravityInterval,
  levelFor,
  lock,
  LOCK_DELAY,
  MAX_LOCK_RESETS,
  type Piece,
  pieceCells,
  type PieceType,
  ROWS,
  scoreForLines,
  shapeSize,
  spawn,
  START_LEVEL,
  tryMove,
  tryRotate,
} from './logic';

export const PIECE_COLORS: Record<PieceType, string> = {
  I: COLORS.pink,
  O: COLORS.cyan,
  T: COLORS.gold,
  S: COLORS.orange,
  Z: COLORS.purple,
  J: COLORS.green,
  L: COLORS.blue,
};

const CELL = 16;
const FIELD_W = COLS * CELL;
const PANEL_X = FIELD_W + 12;
const CLEAR_TIME = 0.2;
const END_DELAY = 1.0;

export function createGame(): Game {
  let ctx!: GameContext;
  let board: Board = createBoard();
  let piece!: Piece;
  let nextType!: PieceType;
  let bag!: () => PieceType;
  let startLevel = 1;
  let level = 1;
  let lines = 0;
  let score = 0;
  let gravityAcc = 0;
  let lockTimer = 0;
  let lockResets = 0;
  let das = { dir: 0, timer: 0, arr: 0 };
  let clearing: number[] = [];
  let clearTimer = 0;
  let endTimer = -1;
  let finished = false;
  let time = 0;

  const grounded = () => tryMove(board, piece, 0, 1) === null;

  const onMoved = () => {
    if (grounded() && lockResets < MAX_LOCK_RESETS) {
      lockTimer = 0;
      lockResets++;
    }
  };

  const shift = (dir: number): boolean => {
    const moved = tryMove(board, piece, dir, 0);
    if (!moved) return false;
    piece = moved;
    onMoved();
    return true;
  };

  const rotate = (dir: 1 | -1) => {
    const rotated = tryRotate(board, piece, dir);
    if (!rotated) return;
    piece = rotated;
    onMoved();
    ctx.audio.play('move');
  };

  const gameOver = () => {
    endTimer = END_DELAY;
    ctx.audio.play('die');
  };

  const spawnNext = () => {
    piece = spawn(nextType);
    nextType = bag();
    lockTimer = 0;
    lockResets = 0;
    gravityAcc = 0;
    if (collides(board, piece)) gameOver();
  };

  const lockPiece = () => {
    const result = lock(board, piece);
    board = result.board;
    ctx.audio.play('lock');
    if (result.toppedOut) {
      gameOver();
      return;
    }
    clearing = fullRows(board);
    if (clearing.length) clearTimer = CLEAR_TIME;
    else spawnNext();
  };

  const finalizeClear = () => {
    const result = clearLines(board);
    board = result.board;
    score += scoreForLines(result.cleared, level);
    lines += result.cleared;
    level = levelFor(startLevel, lines);
    ctx.setScore(score);
    ctx.audio.play(result.cleared === 4 ? 'tetris' : 'line');
    clearing = [];
    spawnNext();
  };

  const hardDrop = () => {
    const d = dropDistance(board, piece);
    piece = { ...piece, y: piece.y + d };
    score += d * 2;
    ctx.setScore(score);
    lockPiece();
  };

  const handleShift = (dt: number) => {
    const { input } = ctx;
    if (input.wasPressed('left')) {
      shift(-1);
      das = { dir: -1, timer: 0, arr: 0 };
      return;
    }
    if (input.wasPressed('right')) {
      shift(1);
      das = { dir: 1, timer: 0, arr: 0 };
      return;
    }
    const held = input.isDown('left') ? -1 : input.isDown('right') ? 1 : 0;
    if (held === 0) {
      das.dir = 0;
      return;
    }
    if (held !== das.dir) {
      das = { dir: held, timer: 0, arr: 0 };
      return;
    }
    das.timer += dt;
    if (das.timer < DAS) return;
    das.arr += dt;
    while (das.arr >= ARR) {
      das.arr -= ARR;
      if (!shift(held)) break;
    }
  };

  const drawCell = (g: CanvasRenderingContext2D, x: number, y: number, color: string, size = CELL) => {
    drawBevel(g, x, y, size, size, color, Math.max(1, Math.floor(size / 8)));
  };

  return {
    init(context) {
      ctx = context;
      board = createBoard();
      bag = createBag(ctx.random);
      startLevel = START_LEVEL[ctx.difficulty];
      level = startLevel;
      lines = 0;
      score = 0;
      das = { dir: 0, timer: 0, arr: 0 };
      clearing = [];
      clearTimer = 0;
      endTimer = -1;
      finished = false;
      time = 0;
      nextType = bag();
      spawnNext();
    },

    update(dt) {
      time += dt;
      if (endTimer >= 0) {
        endTimer -= dt;
        if (endTimer < 0 && !finished) {
          finished = true;
          ctx.finish({ score, completed: true });
        }
        return;
      }
      if (clearing.length) {
        clearTimer -= dt;
        if (clearTimer <= 0) finalizeClear();
        return;
      }
      const { input } = ctx;
      if (input.wasPressed('up')) rotate(1);
      if (input.wasPressed('secondary')) rotate(-1);
      handleShift(dt);
      if (input.wasPressed('primary')) {
        hardDrop();
        return;
      }
      const soft = input.isDown('down');
      const interval = soft ? Math.min(gravityInterval(level), 0.05) : gravityInterval(level);
      if (!grounded()) {
        lockTimer = 0;
        gravityAcc += dt;
        while (gravityAcc >= interval) {
          gravityAcc -= interval;
          const moved = tryMove(board, piece, 0, 1);
          if (!moved) {
            gravityAcc = 0;
            break;
          }
          piece = moved;
          if (soft) {
            score += 1;
            ctx.setScore(score);
          }
        }
      } else {
        gravityAcc = 0;
        lockTimer += dt;
        if (lockTimer >= LOCK_DELAY) lockPiece();
      }
    },

    render() {
      const g = ctx.ctx;
      clear(g, ctx.width, ctx.height);
      g.fillStyle = COLORS.panel;
      g.fillRect(0, 0, FIELD_W, ROWS * CELL);
      g.fillStyle = '#22223c';
      for (let x = 1; x < COLS; x++) g.fillRect(x * CELL, 0, 1, ROWS * CELL);
      for (let y = 1; y < ROWS; y++) g.fillRect(0, y * CELL, FIELD_W, 1);

      const flashOn = Math.floor(time * 20) % 2 === 0;
      const endRows = endTimer >= 0 ? Math.floor(((END_DELAY - endTimer) / END_DELAY) * ROWS) : 0;
      for (let y = 0; y < ROWS; y++) {
        const grey = endTimer >= 0 && y >= ROWS - endRows;
        const clearingRow = clearing.includes(y);
        for (let x = 0; x < COLS; x++) {
          const t = board[y][x];
          if (!t) continue;
          if (clearingRow) {
            g.fillStyle = flashOn ? '#ffffff' : PIECE_COLORS[t];
            g.fillRect(x * CELL, y * CELL, CELL, CELL);
          } else {
            drawCell(g, x * CELL, y * CELL, grey ? '#55556e' : PIECE_COLORS[t]);
          }
        }
      }

      if (endTimer < 0 && !clearing.length) {
        const ghostY = piece.y + dropDistance(board, piece);
        g.strokeStyle = PIECE_COLORS[piece.type];
        g.globalAlpha = 0.45;
        g.lineWidth = 1;
        for (const c of pieceCells({ ...piece, y: ghostY })) {
          if (c.y >= 0) g.strokeRect(c.x * CELL + 1.5, c.y * CELL + 1.5, CELL - 3, CELL - 3);
        }
        g.globalAlpha = 1;
        for (const c of pieceCells(piece)) if (c.y >= 0) drawCell(g, c.x * CELL, c.y * CELL, PIECE_COLORS[piece.type]);
      }

      g.fillStyle = COLORS.panelLight;
      g.fillRect(FIELD_W, 0, 2, ROWS * CELL);

      drawText(g, 'NEXT', PANEL_X, 8, { color: COLORS.muted });
      g.fillStyle = COLORS.panel;
      g.fillRect(PANEL_X, 22, 104, 56);
      const n = shapeSize(nextType);
      const small = 12;
      const shape = cells(nextType, 0);
      const minY = Math.min(...shape.map((c) => c.y));
      const maxY = Math.max(...shape.map((c) => c.y));
      const ox = PANEL_X + (104 - n * small) / 2;
      const oy = 22 + (56 - (maxY - minY + 1) * small) / 2 - minY * small;
      for (const c of shape) drawCell(g, Math.round(ox + c.x * small), Math.round(oy + c.y * small), PIECE_COLORS[nextType], small);

      const stat = (label: string, value: string, y: number, color: string) => {
        drawText(g, label, PANEL_X, y, { color: COLORS.muted });
        drawText(g, value, PANEL_X, y + 14, { color });
      };
      stat('SCORE', String(score), 96, COLORS.gold);
      stat('LINES', String(lines), 136, COLORS.text);
      stat('LEVEL', String(level), 176, COLORS.cyan);
    },

    destroy() {
      return;
    },
  };
}
