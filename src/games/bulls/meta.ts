import { COLORS, drawBevel, drawText } from '../../core/pixel';
import type { GameMeta } from '../../types/game';

export const meta: GameMeta = {
  id: 'bulls',
  order: 12,
  title: '1A2B 猜數字',
  description: '猜出不重複的神秘數字。A 代表數字和位置都對，B 代表數字對但位置錯，猜越少次越厲害。',
  categories: ['puzzle'],
  scoreOrder: 'lower',
  scoreLabel: '猜測次數',
  formatScore: (s) => `${s} 次`,
  controls: [
    { keys: '數字鍵 0～9', action: '在選取的格子輸入數字' },
    { keys: '← → / 點擊格子', action: '選擇要輸入哪一格' },
    { keys: 'Backspace / X', action: '刪除' },
    { keys: 'Enter / 空白鍵', action: '送出猜測' },
    { keys: '滑鼠', action: '點擊畫面上的數字鍵盤' },
  ],
  touchHint: '先點上方的格子選位置，再點數字鍵盤',
  padLayout: 'none',
  size: () => ({ width: 240, height: 360 }),
  drawThumbnail(ctx, w, h) {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(16, 10, w - 32, 66);
    const rows: [string, string, string][] = [
      ['1 2 3 4', '0A', '2B'],
      ['5 6 2 1', '1A', '1B'],
      ['5 0 4 2', '2A', '1B'],
    ];
    rows.forEach(([guess, a, b], i) => {
      const y = 16 + i * 20;
      drawText(ctx, guess, 26, y, { color: COLORS.text });
      drawText(ctx, a, 104, y, { color: COLORS.cyan });
      drawText(ctx, b, 126, y, { color: COLORS.gold });
    });
    ['5', '8', '4', '2'].forEach((d, i) => {
      const x = 32 + i * 26;
      drawBevel(ctx, x, 84, 22, 26, i === 0 ? COLORS.pink : COLORS.panelLight, 2);
      drawText(ctx, d, x + 11, 91, { size: 8, color: COLORS.text, align: 'center' });
    });
  },
};
