import { clear, COLORS } from '../../core/pixel';
import type { GameMeta } from '../../types/game';

export const meta: GameMeta = {
  id: 'rocks',
  order: 14,
  title: '隕石帶',
  description: '駕駛小飛船在隕石帶中求生。打碎大隕石會裂成小塊，飛出畫面邊緣會從另一邊回來。',
  categories: ['shooter'],
  scoreOrder: 'higher',
  scoreLabel: '分數',
  controls: [
    { keys: '← → / A D', action: '旋轉船身' },
    { keys: '↑ / W', action: '推進' },
    { keys: '空白鍵 / Z', action: '射擊（按住連射）' },
    { keys: 'X', action: '緊急瞬移到安全位置（2 秒冷卻）' },
  ],
  touchHint: '十字鍵 ◀ ▶ 旋轉、▲ 推進，A 射擊，B 瞬移',
  padLayout: 'dpad-ab',
  padLabels: { a: '射擊', b: '瞬移' },
  size: () => ({ width: 320, height: 320 }),
  drawThumbnail(ctx, w, h) {
    clear(ctx, w, h);
    const rock = (cx: number, cy: number, r: number, k: number[]) => {
      ctx.beginPath();
      k.forEach((m, i) => {
        const a = (i / k.length) * Math.PI * 2;
        const x = Math.round(cx + Math.cos(a) * r * m) + 0.5;
        const y = Math.round(cy + Math.sin(a) * r * m) + 0.5;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = '#1c1c34';
      ctx.fill();
      ctx.strokeStyle = '#a0a0c8';
      ctx.lineWidth = 1;
      ctx.stroke();
    };
    rock(40, 34, 22, [1, 0.8, 0.95, 0.75, 1, 0.85, 0.9, 0.78, 1, 0.82]);
    rock(130, 80, 14, [0.9, 1, 0.8, 0.95, 0.75, 1, 0.85, 0.9]);
    rock(150, 24, 8, [1, 0.8, 0.9, 1, 0.75, 0.95]);
    rock(30, 96, 6, [1, 0.8, 0.9, 1, 0.75, 0.95]);
    ctx.beginPath();
    ctx.moveTo(98.5, 58.5);
    ctx.lineTo(84.5, 66.5);
    ctx.lineTo(88.5, 58.5);
    ctx.lineTo(84.5, 50.5);
    ctx.closePath();
    ctx.fillStyle = '#0a3a48';
    ctx.fill();
    ctx.strokeStyle = COLORS.cyan;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(108, 58, 2, 2);
    ctx.fillRect(120, 58, 2, 2);
  },
};
