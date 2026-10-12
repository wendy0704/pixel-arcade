import { drawDisc } from '../../core/pixel';
import type { GameMeta } from '../../types/game';

export const meta: GameMeta = {
  id: 'reversi',
  order: 18,
  title: '黑白棋',
  description: '夾住對手的棋子就能翻成自己的顏色。你執黑先下，棋盤下滿時棋子多的一方獲勝，角落是兵家必爭之地。',
  categories: ['board'],
  scoreOrder: 'higher',
  scoreLabel: '黑子數',
  controls: [
    { keys: '滑鼠', action: '點擊有綠點提示的格子落子' },
    { keys: '方向鍵', action: '移動游標' },
    { keys: '空白鍵 / Z', action: '在游標位置落子' },
  ],
  touchHint: '點擊有綠點提示的格子',
  padLayout: 'none',
  size: () => ({ width: 240, height: 284 }),
  drawThumbnail(ctx, w, h) {
    ctx.fillStyle = '#1d6b45';
    ctx.fillRect(0, 0, w, h);
    const cell = 15;
    const ox = Math.round((w - cell * 8) / 2);
    const oy = 0;
    ctx.fillStyle = '#2a8a5a';
    ctx.fillRect(ox, oy, cell * 8, cell * 8);
    ctx.fillStyle = '#1d6b45';
    for (let k = 1; k < 8; k++) {
      ctx.fillRect(ox + k * cell, oy, 1, cell * 8);
      ctx.fillRect(ox, oy + k * cell, cell * 8, 1);
    }
    const rows = ['........', '........', '..wb....', '..bbbw..', '...wbw..', '....wb..', '........', '........'];
    rows.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        if (ch === '.') return;
        drawDisc(ctx, ox + c * cell + cell / 2, oy + r * cell + cell / 2, 6, ch === 'b' ? '#141420' : '#f0f0f0');
      }),
    );
  },
};
