import { clear, COLORS } from '../../core/pixel';
import type { GameMeta } from '../../types/game';

export const meta: GameMeta = {
  id: 'snake',
  order: 1,
  title: '貪食蛇',
  description: '吃掉食物讓蛇身變長，小心別撞到牆壁或自己。',
  categories: ['action'],
  scoreOrder: 'higher',
  scoreLabel: '分數',
  controls: [{ keys: '方向鍵 / WASD', action: '改變前進方向' }],
  touchHint: '使用畫面下方的十字鍵',
  padLayout: 'dpad-ab',
  size: () => ({ width: 320, height: 320 }),
  drawThumbnail(ctx, w, h) {
    clear(ctx, w, h);
    const c = 8;
    ctx.fillStyle = COLORS.panel;
    for (let y = c; y < h; y += c) for (let x = c; x < w; x += c) ctx.fillRect(x, y, 1, 1);
    const path: [number, number][] = [
      [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [8, 9], [8, 8], [8, 7], [9, 7], [10, 7], [11, 7], [12, 7], [12, 8],
    ];
    path.forEach(([x, y], i) => {
      ctx.fillStyle = i === path.length - 1 ? '#7beaa9' : COLORS.green;
      ctx.fillRect(x * c, y * c, c, c);
    });
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(12 * c + 1, 8 * c + 5, 2, 2);
    ctx.fillRect(12 * c + 5, 8 * c + 5, 2, 2);
    ctx.fillStyle = COLORS.pink;
    ctx.fillRect(12 * c + 1, 11 * c, 6, 8);
    ctx.fillRect(12 * c, 11 * c + 1, 8, 6);
  },
};
