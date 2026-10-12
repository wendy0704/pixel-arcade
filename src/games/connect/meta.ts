import { clear, COLORS, drawDisc } from '../../core/pixel';
import type { GameMeta } from '../../types/game';

export const meta: GameMeta = {
  id: 'connect',
  order: 17,
  title: '四子連線',
  description: '輪流把棋子投進直立的棋盤，先讓四顆連成一線的人獲勝。和電腦連下 3 局。',
  categories: ['board'],
  scoreOrder: 'higher',
  scoreLabel: '分數',
  controls: [
    { keys: '← →', action: '選擇直行' },
    { keys: '空白鍵 / Z / ↓', action: '投下棋子' },
    { keys: '滑鼠', action: '點擊直行投下棋子' },
  ],
  touchHint: '點擊想投入的直行',
  padLayout: 'none',
  size: () => ({ width: 240, height: 290 }),
  drawThumbnail(ctx, w, h) {
    clear(ctx, w, h);
    const cell = 18;
    const ox = Math.round((w - cell * 7) / 2);
    const oy = 8;
    ctx.fillStyle = '#1f2f8a';
    ctx.fillRect(ox - 3, oy - 3, cell * 7 + 6, cell * 6 + 6);
    const board = [
      '.......',
      '.......',
      '...g...',
      '..pg...',
      '..gpp..',
      '.ppgpg.',
    ];
    board.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        const x = ox + c * cell + cell / 2;
        const y = oy + r * cell + cell / 2;
        drawDisc(ctx, x, y, 7, '#101038');
        if (ch !== '.') drawDisc(ctx, x, y, 7, ch === 'p' ? COLORS.pink : COLORS.gold);
      }),
    );
  },
};
