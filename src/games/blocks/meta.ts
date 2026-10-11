import { clear, COLORS, drawBevel } from '../../core/pixel';
import type { GameMeta } from '../../types/game';

export const meta: GameMeta = {
  id: 'blocks',
  order: 4,
  title: '方塊堆疊',
  description: '移動並旋轉落下的方塊，填滿一整行就能消除。一次消越多行分數越高。',
  categories: ['puzzle'],
  scoreOrder: 'higher',
  scoreLabel: '分數',
  controls: [
    { keys: '← →', action: '左右移動（按住連續移動）' },
    { keys: '↓', action: '加速下落' },
    { keys: '↑', action: '順時針旋轉' },
    { keys: 'X', action: '逆時針旋轉' },
    { keys: '空白鍵 / Z', action: '直接落下' },
  ],
  touchHint: '十字鍵移動，▲ 旋轉，A 直接落下，B 逆時針旋轉',
  padLayout: 'dpad-ab',
  padLabels: { a: '落下', b: '旋轉' },
  size: () => ({ width: 288, height: 320 }),
  drawThumbnail(ctx, w, h) {
    clear(ctx, w, h);
    const s = 10;
    const ox = 30;
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(ox, 0, s * 10, h);
    const rows = [
      '..........',
      '....PPPP..',
      '..........',
      '..........',
      '..........',
      '.........G',
      'C......GGG',
      'CC..YY.OO.',
      'OCPPYYBOOR',
      'OOGPPBBBRR',
      'LLGGRRYYRR',
      'LLLGRRYYCC',
    ];
    const map: Record<string, string> = {
      P: COLORS.pink,
      C: COLORS.cyan,
      Y: COLORS.gold,
      O: COLORS.orange,
      R: COLORS.purple,
      G: COLORS.green,
      B: COLORS.blue,
      L: COLORS.blue,
    };
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (map[ch]) drawBevel(ctx, ox + x * s, y * s, s, s, map[ch], 1);
      }),
    );
    ctx.fillStyle = COLORS.panelLight;
    ctx.fillRect(ox + s * 10, 0, 2, h);
    drawBevel(ctx, 140, 14, 8, 8, COLORS.gold, 1);
    drawBevel(ctx, 148, 14, 8, 8, COLORS.gold, 1);
    drawBevel(ctx, 140, 22, 8, 8, COLORS.gold, 1);
    drawBevel(ctx, 148, 22, 8, 8, COLORS.gold, 1);
  },
};
