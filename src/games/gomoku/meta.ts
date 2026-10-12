import { COLORS, drawDisc } from '../../core/pixel';
import type { GameMeta } from '../../types/game';

export const meta: GameMeta = {
  id: 'gomoku',
  order: 19,
  title: '五子棋',
  description: '在 15×15 的棋盤上和電腦輪流落子，先讓五顆連成一線的人獲勝。你執黑先下，越快獲勝分數越高。',
  categories: ['board'],
  scoreOrder: 'higher',
  scoreLabel: '分數',
  controls: [
    { keys: '滑鼠', action: '點擊交叉點落子' },
    { keys: '方向鍵', action: '移動游標' },
    { keys: '空白鍵 / Z', action: '在游標位置落子' },
  ],
  touchHint: '點一下預覽位置，再點一次確認落子',
  padLayout: 'none',
  size: () => ({ width: 240, height: 294 }),
  drawThumbnail(ctx, w, h) {
    ctx.fillStyle = '#c8964e';
    ctx.fillRect(0, 0, w, h);
    const gap = 12;
    ctx.fillStyle = '#6a4420';
    for (let k = 0; k < 14; k++) {
      ctx.fillRect(4 + k * gap, 0, 1, h);
      ctx.fillRect(0, 6 + k * gap, w, 1);
    }
    const stones: [number, number, 'b' | 'w'][] = [
      [4, 2, 'b'], [5, 3, 'b'], [6, 4, 'b'], [7, 5, 'b'], [8, 6, 'b'],
      [5, 4, 'w'], [6, 3, 'w'], [7, 4, 'w'], [6, 5, 'w'], [9, 5, 'w'],
    ];
    for (const [c, r, s] of stones) drawDisc(ctx, 4 + c * gap + 1, 6 + r * gap + 1, 5, s === 'b' ? '#141420' : '#f4f4f4');
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(4 + 8 * gap, 6 + 6 * gap, 2, 2);
  },
};
