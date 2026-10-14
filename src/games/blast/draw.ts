import { COLORS, drawBevel } from '../../core/pixel';
import type { Shape } from './logic';

export const PIECE_COLORS = [COLORS.cyan, COLORS.pink, COLORS.gold, COLORS.green, COLORS.purple, COLORS.orange, COLORS.blue, COLORS.red];

export const EMPTY_CELL = '#1d1d36';

export function drawBlock(g: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
  const inset = size >= 16 ? 1 : 0;
  drawBevel(g, x + inset, y + inset, size - inset * 2, size - inset * 2, color, Math.max(1, Math.floor(size / 8)));
}

export function drawShape(g: CanvasRenderingContext2D, s: Shape, x: number, y: number, size: number, color: string): void {
  for (const [c, r] of s.cells) drawBlock(g, Math.round(x + c * size), Math.round(y + r * size), size, color);
}
