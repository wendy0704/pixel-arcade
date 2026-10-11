import { COLORS, drawBevel, drawSprite, drawText } from '../../core/pixel';

export const FLAG = ['..XR....', '..XRRR..', '..XRRRR.', '..XRR...', '..X.....', '..X.....', '.XXX....', 'XXXXX...'];
export const MINE = ['...X....', '.X.X.X..', '..XXX...', 'XXXWXXX.', '..XXX...', '.X.X.X..', '...X....', '........'];

export const NUMBER_COLORS = ['', COLORS.cyan, COLORS.green, COLORS.pink, COLORS.blue, COLORS.orange, COLORS.purple, COLORS.gold, COLORS.text];

export function drawClosed(g: CanvasRenderingContext2D, x: number, y: number, size: number, highlight = false): void {
  drawBevel(g, x, y, size, size, highlight ? '#45457a' : '#34345a', Math.max(1, Math.floor(size / 8)));
}

export function drawOpen(g: CanvasRenderingContext2D, x: number, y: number, size: number, fill = '#12122a'): void {
  g.fillStyle = '#1f1f3a';
  g.fillRect(x, y, size, size);
  g.fillStyle = fill;
  g.fillRect(x + 1, y + 1, size - 1, size - 1);
}

export function drawNumber(g: CanvasRenderingContext2D, n: number, x: number, y: number, size: number): void {
  drawText(g, String(n), x + size / 2, y + size / 2 + 1, { size: 8, color: NUMBER_COLORS[n], align: 'center', baseline: 'middle' });
}

export function drawFlag(g: CanvasRenderingContext2D, x: number, y: number, scale = 1): void {
  drawSprite(g, FLAG, x, y, { X: COLORS.text, R: COLORS.red }, scale);
}

export function drawMine(g: CanvasRenderingContext2D, x: number, y: number, scale = 1): void {
  drawSprite(g, MINE, x, y, { X: COLORS.text, W: '#ffffff' }, scale);
}
