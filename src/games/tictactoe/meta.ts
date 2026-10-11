import { clear, COLORS } from '../../core/pixel';
import type { GameMeta } from '../../types/game';
import { drawO, drawX } from './marks';

export const meta: GameMeta = {
  id: 'tictactoe',
  order: 9,
  title: '井字遊戲',
  description: '和電腦連下 5 局，先連成一線的人獲勝。困難模式的電腦不會犯錯，能和局就不錯了。',
  categories: ['board'],
  scoreOrder: 'higher',
  scoreLabel: '分數',
  controls: [
    { keys: '滑鼠', action: '點擊格子落子' },
    { keys: '方向鍵', action: '移動游標' },
    { keys: '空白鍵 / Z', action: '在游標位置落子' },
  ],
  touchHint: '直接點擊格子',
  padLayout: 'none',
  size: () => ({ width: 240, height: 288 }),
  drawThumbnail(ctx, w, h) {
    clear(ctx, w, h);
    const cell = 32;
    const ox = Math.round((w - cell * 3) / 2);
    const oy = Math.round((h - cell * 3) / 2);
    const board = ['X', 'O', '', '', 'X', 'O', 'O', '', 'X'];
    board.forEach((m, i) => {
      const x = ox + (i % 3) * cell;
      const y = oy + Math.floor(i / 3) * cell;
      ctx.fillStyle = i % 4 === 0 ? '#3a3a20' : COLORS.panel;
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      if (m === 'X') drawX(ctx, x, y, cell);
      if (m === 'O') drawO(ctx, x, y, cell);
    });
  },
};
