import { clear, COLORS, drawSprite } from '../../core/pixel';
import type { GameMeta } from '../../types/game';
import { BEETLE_FRAMES, FRIGHT_COLOR, PERSONA_COLORS, SLIME_COLOR, SLIME_FRAMES, STAR } from './sprites';

export const meta: GameMeta = {
  id: 'maze',
  order: 16,
  title: '迷宮吃豆',
  description: '操控小史萊姆吃光迷宮裡的豆子，躲開四隻個性不同的甲蟲。吃下星星後可以反過來追牠們。',
  categories: ['action'],
  scoreOrder: 'higher',
  scoreLabel: '分數',
  controls: [
    { keys: '方向鍵 / WASD', action: '移動（可以提前按下一個轉彎方向）' },
    { keys: '滑動', action: '在畫面上滑動切換方向' },
  ],
  touchHint: '在畫面上滑動，或用十字鍵轉彎',
  padLayout: 'dpad-ab',
  size: () => ({ width: 228, height: 276 }),
  drawThumbnail(ctx, w, h) {
    clear(ctx, w, h);
    const wall = (x: number, y: number, ww: number, hh: number) => {
      ctx.fillStyle = '#12123a';
      ctx.fillRect(x, y, ww, hh);
      ctx.strokeStyle = COLORS.blue;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, ww - 1, hh - 1);
    };
    wall(0, 0, w, 8);
    wall(0, h - 8, w, 8);
    wall(0, 0, 8, h);
    wall(w - 8, 0, 8, h);
    wall(26, 26, 40, 16);
    wall(94, 26, 40, 16);
    wall(26, 76, 40, 18);
    wall(94, 76, 40, 18);
    ctx.fillStyle = '#ffd8a8';
    for (let x = 16; x < w - 12; x += 10) {
      ctx.fillRect(x, 58, 2, 2);
      if (x > 70) ctx.fillRect(x, 16, 2, 2);
    }
    drawSprite(ctx, STAR, 140, 104 - 4, { y: COLORS.gold });
    drawSprite(ctx, SLIME_FRAMES[0], 30, 53, { g: SLIME_COLOR, w: '#ffffff' }, 1);
    drawSprite(ctx, BEETLE_FRAMES[0], 86, 53, { b: PERSONA_COLORS.stalker, l: '#3a2030', w: '#ffffff', k: '#0b0b1a' });
    drawSprite(ctx, BEETLE_FRAMES[1], 104, 53, { b: PERSONA_COLORS.ambusher, l: '#3a2030', w: '#ffffff', k: '#0b0b1a' });
    drawSprite(ctx, BEETLE_FRAMES[0], 70, 98, { b: FRIGHT_COLOR, l: '#20208a', w: '#ffffff', k: '#ffffff' });
  },
};
