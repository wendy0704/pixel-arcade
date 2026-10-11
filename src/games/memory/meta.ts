import { clear } from '../../core/pixel';
import type { GameMeta } from '../../types/game';
import { boardSize, CONFIG } from './logic';
import { drawCardBack, drawCardFace } from './cards';

export const meta: GameMeta = {
  id: 'memory',
  order: 8,
  title: '記憶翻牌',
  description: '一次翻開兩張牌，圖案相同就配對成功。記住每張牌的位置，越快完成越好。',
  categories: ['puzzle'],
  scoreOrder: 'lower',
  scoreLabel: '完成時間',
  formatScore: (s) => `${s.toFixed(1)}s`,
  controls: [
    { keys: '滑鼠', action: '點擊翻牌' },
    { keys: '方向鍵', action: '移動游標' },
    { keys: '空白鍵 / Z', action: '翻開游標所在的牌' },
  ],
  touchHint: '直接點擊卡牌',
  padLayout: 'none',
  size(difficulty) {
    const { cols, rows } = CONFIG[difficulty];
    return boardSize(cols, rows);
  },
  drawThumbnail(ctx, w, h) {
    clear(ctx, w, h);
    const cw = 30;
    const ch = 38;
    const layout: (number | null)[] = [null, 0, null, 7, 0, null, 1, null];
    layout.forEach((icon, i) => {
      const x = 12 + (i % 4) * (cw + 6);
      const y = 16 + Math.floor(i / 4) * (ch + 8);
      if (icon === null) drawCardBack(ctx, x, y, cw, ch);
      else drawCardFace(ctx, icon, x, y, cw, ch, icon === 0);
    });
  },
};
