import { COLORS, drawText } from '../../core/pixel';
import type { GameMeta } from '../../types/game';
import { formatTime } from './logic';

const SAMPLE = [
  '53..7....',
  '6..195...',
  '.98....6.',
  '8...6...3',
  '4..8.3..1',
  '7...2...6',
  '.6....28.',
  '...419..5',
  '....8..79',
];

export const meta: GameMeta = {
  id: 'sudoku',
  order: 13,
  title: '數獨',
  description: '在 9×9 的格子填入 1～9，讓每一行、每一列、每個 3×3 宮格都不重複。每題保證只有一組解。',
  categories: ['puzzle'],
  scoreOrder: 'lower',
  scoreLabel: '完成時間',
  formatScore: (s) => formatTime(s),
  controls: [
    { keys: '方向鍵 / WASD', action: '移動游標' },
    { keys: '數字鍵 1～9', action: '填入數字（再按一次相同數字可清除）' },
    { keys: 'Backspace / 0 / X', action: '清除格子' },
    { keys: 'N / 空白鍵', action: '切換筆記模式' },
    { keys: '滑鼠', action: '點格子選取，再點下方數字填入' },
  ],
  touchHint: '點格子選取，再點下方數字填入；雙指可以放大縮小',
  padLayout: 'none',
  zoomable: true,
  size: () => ({ width: 240, height: 320 }),
  drawThumbnail(ctx, w, h) {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);
    const cell = 12;
    const size = cell * 9;
    const ox = Math.round((w - size) / 2);
    const oy = Math.round((h - size) / 2);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(ox, oy, size, size);
    ctx.fillStyle = '#43437a';
    ctx.fillRect(ox + 4 * cell, oy + 4 * cell, cell, cell);
    ctx.fillStyle = '#2e2e52';
    for (let k = 1; k < 9; k++) {
      ctx.fillRect(ox + k * cell, oy, 1, size);
      ctx.fillRect(ox, oy + k * cell, size, 1);
    }
    ctx.fillStyle = '#6a6aa8';
    for (let k = 0; k <= 9; k += 3) {
      ctx.fillRect(ox + k * cell - 1, oy - 1, 2, size + 2);
      ctx.fillRect(ox - 1, oy + k * cell - 1, size + 2, 2);
    }
    SAMPLE.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        if (ch === '.') return;
        drawText(ctx, ch, ox + c * cell + 6, oy + r * cell + 3, { size: 8, color: r === 3 && c === 0 ? COLORS.cyan : COLORS.text, align: 'center' });
      }),
    );
  },
};
