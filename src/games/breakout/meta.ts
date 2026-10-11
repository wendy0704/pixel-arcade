import { clear, COLORS, drawBevel } from '../../core/pixel';
import type { GameMeta } from '../../types/game';

const THUMB_COLORS = [COLORS.pink, COLORS.orange, COLORS.gold, COLORS.green, COLORS.cyan];

export const meta: GameMeta = {
  id: 'breakout',
  order: 3,
  title: '打磚塊',
  description: '控制球拍反彈小球，擊碎所有磚塊。打在球拍邊緣可以改變角度。',
  categories: ['action'],
  scoreOrder: 'higher',
  scoreLabel: '分數',
  controls: [
    { keys: '← → / A D', action: '移動球拍' },
    { keys: '滑鼠', action: '移動球拍，點擊發球' },
    { keys: '空白鍵', action: '發球' },
  ],
  touchHint: '直接在畫面上拖曳球拍，點擊發球',
  padLayout: 'lr-a',
  padLabels: { a: '發球' },
  size: () => ({ width: 320, height: 360 }),
  drawThumbnail(ctx, w, h) {
    clear(ctx, w, h);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r === 3 && c === 2) || (r === 4 && (c === 2 || c === 3 || c === 6))) continue;
        drawBevel(ctx, 4 + c * 19, 14 + r * 9, 17, 7, THUMB_COLORS[r], 1);
      }
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(98, 78, 4, 4);
    ctx.fillStyle = COLORS.muted;
    ctx.fillRect(90, 86, 2, 2);
    ctx.fillRect(84, 94, 2, 2);
    drawBevel(ctx, 64, 106, 36, 5, COLORS.text, 1);
  },
};
