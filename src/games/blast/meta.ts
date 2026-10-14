import { clear } from '../../core/pixel';
import type { GameMeta } from '../../types/game';
import { drawBlock, drawShape, EMPTY_CELL, PIECE_COLORS } from './draw';
import { SHAPES } from './logic';

const SAMPLE = [
  '11....44',
  '11....44',
  '22233344',
  '......55',
  '6.....55',
  '66..7...',
  '6...77..',
  '.....7..',
];

const shapeOf = (pattern: string) => {
  const rows = pattern.split('/');
  return SHAPES.find(
    (s) =>
      s.h === rows.length &&
      s.w === rows[0].length &&
      s.cells.length === pattern.split('#').length - 1 &&
      s.cells.every(([c, r]) => rows[r][c] === '#'),
  )!;
};

export const meta: GameMeta = {
  id: 'blast',
  order: 21,
  title: '方塊拼放',
  description: '把下方的三塊方塊拖進 8×8 盤面，填滿整列或整行就會消除。一次消越多、連續消除分數越高，三塊都放不下就結束。',
  categories: ['puzzle'],
  scoreOrder: 'higher',
  scoreLabel: '分數',
  controls: [
    { keys: '滑鼠', action: '按住下方的方塊拖到盤面上放開' },
    { keys: '方向鍵 / WASD', action: '移動預覽位置' },
    { keys: 'X / 數字鍵 1～3', action: '切換要放的方塊' },
    { keys: '空白鍵 / Z', action: '放下方塊' },
  ],
  touchHint: '按住下方的方塊拖到盤面上；方塊會浮在手指上方，不會被擋住',
  padLayout: 'none',
  size: () => ({ width: 240, height: 340 }),
  drawThumbnail(ctx, w, h) {
    clear(ctx, w, h);
    const cell = 12;
    const ox = 10;
    const oy = 12;
    ctx.fillStyle = '#121226';
    ctx.fillRect(ox - 2, oy - 2, cell * 8 + 4, cell * 8 + 4);
    SAMPLE.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        const x = ox + c * cell;
        const y = oy + r * cell;
        if (ch === '.') {
          ctx.fillStyle = EMPTY_CELL;
          ctx.fillRect(x, y, cell - 1, cell - 1);
        } else drawBlock(ctx, x, y, cell, r === 2 ? '#ffffff' : PIECE_COLORS[Number(ch) % PIECE_COLORS.length]);
      }),
    );
    drawShape(ctx, shapeOf('##/##'), 124, 14, 10, PIECE_COLORS[1]);
    drawShape(ctx, shapeOf('###/#../#..'), 120, 46, 10, PIECE_COLORS[3]);
    drawShape(ctx, shapeOf('####'), 116, 90, 9, PIECE_COLORS[6]);
  },
};
