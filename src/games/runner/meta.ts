import { COLORS, drawSprite } from '../../core/pixel';
import type { GameMeta } from '../../types/game';
import { BAT_FRAMES, CACTUS_L, CACTUS_S, RUN_FRAMES, RUNNER_COLORS } from './sprites';

export const meta: GameMeta = {
  id: 'runner',
  order: 11,
  title: '像素跑者',
  description: '自動往前跑，跳過仙人掌、蹲下躲開蝙蝠。速度會越來越快，看你能跑多遠。',
  categories: ['action'],
  scoreOrder: 'higher',
  scoreLabel: '距離',
  controls: [
    { keys: '空白鍵 / ↑', action: '跳躍（按越久跳越高）' },
    { keys: '↓', action: '蹲下；空中按住會加速落地' },
  ],
  touchHint: '點畫面或按 A 跳躍，十字鍵 ▼ 蹲下',
  padLayout: 'dpad-ab',
  padLabels: { a: '跳躍' },
  size: () => ({ width: 320, height: 200 }),
  drawThumbnail(ctx, w, h) {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1a1a36';
    ctx.fillRect(0, 70, 60, 30);
    ctx.fillRect(60, 80, 50, 20);
    ctx.fillRect(110, 66, 50, 34);
    ctx.fillStyle = COLORS.panelLight;
    ctx.fillRect(0, 100, w, 1);
    drawSprite(ctx, RUN_FRAMES[0], 20, 56, RUNNER_COLORS, 2);
    drawSprite(ctx, CACTUS_S, 84, 84, { g: COLORS.green });
    drawSprite(ctx, CACTUS_L, 128, 76, { g: COLORS.green });
    drawSprite(ctx, BAT_FRAMES[0], 70, 30, { b: COLORS.pink, w: '#ffffff' });
  },
};
