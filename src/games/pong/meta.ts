import { clear, COLORS } from '../../core/pixel';
import type { GameMeta } from '../../types/game';

export const meta: GameMeta = {
  id: 'pong',
  order: 6,
  title: '乒乓',
  description: '和電腦對打的桌球，先拿到 7 分獲勝。打在球拍邊緣可以打出角度。',
  categories: ['action'],
  scoreOrder: 'higher',
  scoreLabel: '分數',
  controls: [
    { keys: '↑ ↓ / W S', action: '移動球拍' },
    { keys: '滑鼠', action: '上下移動球拍' },
  ],
  touchHint: '在畫面上拖曳，或使用十字鍵上下',
  padLayout: 'dpad-ab',
  size: () => ({ width: 320, height: 240 }),
  drawThumbnail(ctx, w, h) {
    clear(ctx, w, h);
    ctx.fillStyle = COLORS.panelLight;
    for (let y = 2; y < h; y += 8) ctx.fillRect(w / 2 - 1, y, 2, 4);
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(10, 40, 4, 26);
    ctx.fillStyle = COLORS.pink;
    ctx.fillRect(w - 14, 64, 4, 26);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(98, 56, 4, 4);
    ctx.fillStyle = COLORS.muted;
    ctx.fillRect(88, 52, 2, 2);
    ctx.fillRect(78, 48, 2, 2);
  },
};
