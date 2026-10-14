import { clear } from '../../core/pixel';
import type { GameMeta } from '../../types/game';
import { EXTRA_PENALTY } from './logic';
import { drawTube } from './tubes';

const SAMPLE = [
  [0, 1, 0, 2],
  [2, 1, 2],
  [3, 3, 3, 3],
  [1, 0, 2, 1],
  [0, 4],
  [4, 4, 4],
];

export const meta: GameMeta = {
  id: 'watersort',
  order: 20,
  title: '倒水排序',
  description: `把試管裡的彩色液體倒來倒去，讓每支試管只剩一種顏色。只能倒在相同顏色或空試管上，步數越少越好；加試管會多算 ${EXTRA_PENALTY} 步。`,
  categories: ['puzzle'],
  scoreOrder: 'lower',
  scoreLabel: '步數',
  formatScore: (s) => `${s} 步`,
  controls: [
    { keys: '滑鼠', action: '點一支試管拿起來，再點另一支倒進去' },
    { keys: '方向鍵 / WASD', action: '移動游標' },
    { keys: '空白鍵 / Z', action: '拿起或倒入' },
    { keys: 'X / Backspace / U', action: '上一步' },
    { keys: 'R', action: '重新開始這一題' },
    { keys: 'T', action: '加一支空試管（每局一次）' },
  ],
  touchHint: '點一支試管拿起來，再點另一支倒進去；下方按鈕可以上一步、重來、加試管',
  padLayout: 'none',
  size: () => ({ width: 240, height: 330 }),
  drawThumbnail(ctx, w, h) {
    clear(ctx, w, h);
    const style = { segment: 14, inner: 14, mouth: 6 };
    SAMPLE.forEach((tube, i) => {
      const x = 22 + i * 23;
      drawTube(ctx, tube, x, i === 3 ? 22 : 30, { style, corked: i === 2, rim: i === 3 ? '#00e5ff' : undefined });
    });
  },
};
