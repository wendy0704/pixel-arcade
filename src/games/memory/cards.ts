import { COLORS, drawBevel, drawSprite } from '../../core/pixel';
import { ICONS } from './icons';

export function drawCardBack(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  drawBevel(g, x, y, w, h, '#3a1a4e', 2);
  g.fillStyle = COLORS.pink;
  for (let yy = y + 6; yy < y + h - 4; yy += 8) {
    for (let xx = x + 6 + ((yy - y) % 16 === 6 ? 0 : 4); xx < x + w - 4; xx += 8) g.fillRect(xx, yy, 2, 2);
  }
}

export function drawCardFace(g: CanvasRenderingContext2D, icon: number, x: number, y: number, w: number, h: number, matched: boolean): void {
  drawBevel(g, x, y, w, h, matched ? '#1d3a34' : COLORS.panelLight, 2);
  const art = ICONS[icon % ICONS.length];
  const scale = Math.max(1, Math.min(4, Math.floor((Math.min(w, h) - 8) / 8)));
  const size = 8 * scale;
  drawSprite(g, art.rows, x + (w - size) / 2, y + (h - size) / 2, art.color, scale);
}
