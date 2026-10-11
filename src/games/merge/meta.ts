import { clear, COLORS } from '../../core/pixel';
import type { GameMeta } from '../../types/game';
import { SIZE, tileLayout } from './logic';
import { drawTile } from './tiles';

export const meta: GameMeta = {
  id: 'merge',
  order: 7,
  title: '2048',
  description: '滑動整個盤面，相同數字碰在一起就會合併。目標是合出 2048，盤面塞滿就結束。',
  categories: ['puzzle'],
  scoreOrder: 'higher',
  scoreLabel: '分數',
  controls: [{ keys: '方向鍵 / WASD', action: '往該方向滑動所有方塊' }],
  touchHint: '在盤面上滑動手指，或使用十字鍵',
  padLayout: 'dpad-ab',
  size(difficulty) {
    const { size } = tileLayout(SIZE[difficulty]);
    return { width: size, height: size };
  },
  drawThumbnail(ctx, w, h) {
    clear(ctx, w, h);
    const tile = 24;
    const gap = 4;
    const board = 4 * tile + 5 * gap;
    const ox = Math.round((w - board) / 2);
    const oy = Math.round((h - board) / 2);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(ox, oy, board, board);
    const values = [
      [2, 0, 0, 4],
      [0, 8, 2, 0],
      [16, 64, 8, 2],
      [128, 32, 4, 0],
    ];
    values.forEach((row, r) =>
      row.forEach((v, c) => {
        const x = ox + gap + c * (tile + gap);
        const y = oy + gap + r * (tile + gap);
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(x, y, tile, tile);
        if (v) drawTile(ctx, v, x, y, tile);
      }),
    );
  },
};
