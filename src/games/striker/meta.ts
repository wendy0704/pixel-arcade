import { COLORS, drawSprite } from '../../core/pixel';
import type { GameMeta } from '../../types/game';
import { DIVER, DRONE, ENEMY_COLORS, GUNSHIP, PLAYER, PLAYER_COLORS } from './sprites';

export const meta: GameMeta = {
  id: 'striker',
  order: 15,
  title: '縱向射擊',
  description: '直式捲軸射擊。收集 P 強化火力，危急時丟炸彈清場，每五波會遇到巨大的母艦。',
  categories: ['shooter'],
  scoreOrder: 'higher',
  scoreLabel: '分數',
  controls: [
    { keys: '方向鍵 / WASD', action: '八方向移動' },
    { keys: '空白鍵 / Z', action: '按住連射' },
    { keys: 'X', action: '炸彈：清除敵彈並重創所有敵機' },
    { keys: '滑鼠拖曳', action: '拖曳移動並自動射擊' },
  ],
  touchHint: '手指在畫面上拖曳就會移動並自動射擊；B 丟炸彈',
  padLayout: 'dpad-ab',
  padLabels: { a: '射擊', b: '炸彈' },
  size: () => ({ width: 240, height: 320 }),
  drawThumbnail(ctx, w, h) {
    ctx.fillStyle = '#07071a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4a4a70';
    [[12, 20], [40, 90], [150, 30], [120, 100], [70, 10], [170, 70], [20, 60]].forEach(([x, y]) => ctx.fillRect(x, y, 1, 2));
    drawSprite(ctx, GUNSHIP, 74, 8, ENEMY_COLORS, 2);
    drawSprite(ctx, DRONE, 20, 30, ENEMY_COLORS, 2);
    drawSprite(ctx, DRONE, 140, 34, ENEMY_COLORS, 2);
    drawSprite(ctx, DIVER, 126, 64, ENEMY_COLORS, 2);
    ctx.fillStyle = COLORS.gold;
    [[86, 58], [92, 46], [98, 58]].forEach(([x, y]) => ctx.fillRect(x, y, 2, 6));
    ctx.fillStyle = COLORS.pink;
    ctx.fillRect(56, 60, 3, 3);
    ctx.fillRect(110, 40, 3, 3);
    drawSprite(ctx, PLAYER, 80, 80, PLAYER_COLORS, 2);
  },
};
