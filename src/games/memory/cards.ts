import { COLORS, drawBevel, drawSprite } from '../../core/pixel';
import { ICONS } from './icons';

const QUESTION = ['.XXX.', 'X...X', '....X', '...X.', '..X..', '.....', '..X..'];

export function drawCardBack(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  drawBevel(g, x, y, w, h, '#3a1a4e', 2);
  if (w >= 12) {
    g.fillStyle = '#5a2a72';
    g.fillRect(x + 4, y + 4, w - 8, 1);
    g.fillRect(x + 4, y + h - 5, w - 8, 1);
    g.fillRect(x + 4, y + 4, 1, h - 8);
    g.fillRect(x + w - 5, y + 4, 1, h - 8);
  }
  const scale = Math.floor(w / 14);
  if (scale < 1) return;
  drawSprite(g, QUESTION, x + (w - 5 * scale) / 2, y + (h - 7 * scale) / 2, COLORS.pink, scale);
}

export function drawCardFace(g: CanvasRenderingContext2D, icon: number, x: number, y: number, w: number, h: number, matched: boolean): void {
  drawBevel(g, x, y, w, h, matched ? '#1d3a34' : COLORS.panelLight, 2);
  const art = ICONS[icon % ICONS.length];
  const base = Math.max(1, Math.min(4, Math.floor((Math.min(w, h) - 8) / 8)));
  const cols = art.rows[0].length;
  const scale = cols > 8 ? Math.max(1, Math.floor((base * 8) / cols)) : base;
  const aw = cols * scale;
  const ah = art.rows.length * scale;
  drawSprite(g, art.rows, Math.round(x + (w - aw) / 2), Math.round(y + (h - ah) / 2), art.color, scale);
}
