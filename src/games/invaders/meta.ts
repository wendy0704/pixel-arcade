import { clear, COLORS, drawSprite } from '../../core/pixel';
import type { GameMeta } from '../../types/game';
import { ALIEN_COLORS, ALIENS, alienType, PLAYER, UFO } from './sprites';

export const meta: GameMeta = {
  id: 'invaders',
  order: 5,
  title: '星際入侵',
  description: '駕駛砲台擊退步步逼近的外星艦隊，善用掩體躲避攻擊。',
  categories: ['shooter'],
  scoreOrder: 'higher',
  scoreLabel: '分數',
  controls: [
    { keys: '← → / A D', action: '移動砲台' },
    { keys: '空白鍵 / Z', action: '射擊（同時只能有一發）' },
  ],
  touchHint: '左右鍵移動，A 射擊',
  padLayout: 'lr-a',
  padLabels: { a: '射擊' },
  size: () => ({ width: 320, height: 360 }),
  drawThumbnail(ctx, w, h) {
    clear(ctx, w, h);
    drawSprite(ctx, UFO, 120, 6, { X: COLORS.red, G: COLORS.cyan });
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        drawSprite(ctx, ALIENS[alienType(row + (row > 0 ? 1 : 0))][col % 2], 22 + col * 20, 22 + row * 14, ALIEN_COLORS[row + (row > 0 ? 1 : 0)]);
      }
    }
    ctx.fillStyle = COLORS.green;
    ctx.fillRect(28, 90, 18, 8);
    ctx.fillRect(72, 90, 18, 8);
    ctx.fillRect(116, 90, 18, 8);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(83, 76, 1, 5);
    drawSprite(ctx, PLAYER, 77, 104, COLORS.cyan);
    ctx.fillStyle = COLORS.pink;
    ctx.fillRect(0, 115, w, 1);
  },
};
