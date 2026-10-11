import { COLORS, drawBevel, drawText } from '../../core/pixel';

const TILE_COLORS: Record<number, string> = {
  2: '#3a3a64',
  4: '#4a4a80',
  8: COLORS.blue,
  16: COLORS.cyan,
  32: COLORS.green,
  64: '#9be34a',
  128: COLORS.gold,
  256: COLORS.orange,
  512: COLORS.red,
  1024: COLORS.pink,
  2048: COLORS.purple,
};

export function tileColor(value: number): string {
  return TILE_COLORS[value] ?? '#ffffff';
}

export function fontSizeFor(value: number, tile: number): number {
  const digits = String(value).length;
  return Math.max(8, Math.min(16, Math.floor((tile - 8) / digits / 8) * 8));
}

export function drawTile(g: CanvasRenderingContext2D, value: number, x: number, y: number, tile: number, scale = 1): void {
  const s = Math.max(2, Math.round(tile * scale));
  const ox = Math.round(x + (tile - s) / 2);
  const oy = Math.round(y + (tile - s) / 2);
  const color = tileColor(value);
  drawBevel(g, ox, oy, s, s, color, Math.max(2, Math.floor(s / 14)));
  if (scale < 0.5) return;
  const dark = value >= 16 && value !== 8 && value <= 2048;
  drawText(g, String(value), ox + s / 2, oy + s / 2 + 1, {
    size: fontSizeFor(value, tile),
    color: dark ? COLORS.bg : COLORS.text,
    align: 'center',
    baseline: 'middle',
  });
}
