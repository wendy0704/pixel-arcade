import { COLORS, drawBevel, drawSprite } from '../../core/pixel';
import type { GameMeta } from '../../types/game';
import { BIRD_COLORS, BIRD_FRAMES } from './sprites';

export const meta: GameMeta = {
  id: 'flyer',
  order: 10,
  title: '像素飛鳥',
  description: '點一下就往上飛，穿過水管之間的縫隙。只用一個按鍵，越撐越久分數越高。',
  categories: ['action'],
  scoreOrder: 'higher',
  scoreLabel: '分數',
  controls: [
    { keys: '空白鍵 / ↑ / Z', action: '拍翅往上飛' },
    { keys: '滑鼠', action: '點擊畫面拍翅' },
  ],
  touchHint: '點畫面或按 A 拍翅',
  padLayout: 'a',
  padLabels: { a: '拍翅' },
  size: () => ({ width: 240, height: 320 }),
  drawThumbnail(ctx, w, h) {
    ctx.fillStyle = '#10103a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1c1c4a';
    [[0, 30], [18, 50], [40, 24], [58, 40], [90, 56], [112, 28], [130, 44]].forEach(([x, bh]) => ctx.fillRect(x, 104 - bh, 16, bh));
    drawBevel(ctx, 100, 0, 20, 34, COLORS.green, 2);
    drawBevel(ctx, 97, 28, 26, 6, '#2fb86d', 1);
    drawBevel(ctx, 100, 76, 20, 28, COLORS.green, 2);
    drawBevel(ctx, 97, 76, 26, 6, '#2fb86d', 1);
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(0, 104, w, h - 104);
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(0, 104, w, 2);
    drawSprite(ctx, BIRD_FRAMES[0], 44, 50, BIRD_COLORS, 2);
  },
};
