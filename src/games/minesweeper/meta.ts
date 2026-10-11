import { clear } from '../../core/pixel';
import type { GameMeta } from '../../types/game';
import { CELL, CONFIG, HUD } from './logic';
import { drawClosed, drawFlag, drawMine, drawNumber, drawOpen } from './sprites';

export const meta: GameMeta = {
  id: 'minesweeper',
  order: 2,
  title: '踩地雷',
  description: '依照數字推理地雷位置，打開所有安全的格子。第一次點擊保證安全。',
  categories: ['puzzle'],
  scoreOrder: 'lower',
  scoreLabel: '完成時間',
  formatScore: (s) => `${s.toFixed(1)}s`,
  controls: [
    { keys: '滑鼠左鍵', action: '打開格子；點已打開的數字可快速開格' },
    { keys: '滑鼠右鍵', action: '插旗 / 取消' },
    { keys: '方向鍵', action: '移動游標' },
    { keys: '空白鍵 / Z', action: '打開格子' },
    { keys: 'X', action: '插旗 / 取消' },
  ],
  touchHint: '點擊開格，長按插旗；也可以切換成插旗模式',
  padLayout: 'flag-toggle',
  size(difficulty) {
    const { cols, rows } = CONFIG[difficulty];
    return { width: cols * CELL, height: rows * CELL + HUD };
  },
  drawThumbnail(ctx, w, h) {
    clear(ctx, w, h);
    const size = 16;
    const layout = [
      'oo1ccccccc',
      'o12cfcccc',
      'o1ccccc21o',
      'o112c21ooo',
      'oooo1c1ooo',
      'oooo111ooo',
      'o1110oooo',
    ];
    const ox = 0;
    const oy = 4;
    for (let y = 0; y < layout.length; y++) {
      for (let x = 0; x < 10; x++) {
        const ch = layout[y][x] ?? 'c';
        const px = ox + x * size;
        const py = oy + y * size;
        if (ch === 'c' || ch === 'f') {
          drawClosed(ctx, px, py, size);
          if (ch === 'f') drawFlag(ctx, px + 4, py + 4);
        } else {
          drawOpen(ctx, px, py, size);
          if (ch >= '1' && ch <= '8') drawNumber(ctx, Number(ch), px, py, size);
        }
      }
    }
    drawOpen(ctx, ox + 6 * size, oy + 6 * size, size, '#ff4d4d');
    drawMine(ctx, ox + 6 * size + 4, oy + 6 * size + 4);
  },
};
