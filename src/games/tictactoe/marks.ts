import { COLORS } from '../../core/pixel';

export function drawX(g: CanvasRenderingContext2D, x: number, y: number, size: number, color: string = COLORS.cyan): void {
  const dot = Math.max(2, Math.round(size / 12));
  const pad = Math.round(size * 0.2);
  const len = size - pad * 2 - dot;
  g.fillStyle = color;
  for (let i = 0; i <= len; i += Math.max(1, Math.floor(dot / 2))) {
    g.fillRect(x + pad + i, y + pad + i, dot, dot);
    g.fillRect(x + size - pad - dot - i, y + pad + i, dot, dot);
  }
}

export function drawO(g: CanvasRenderingContext2D, x: number, y: number, size: number, color: string = COLORS.pink): void {
  const dot = Math.max(2, Math.round(size / 12));
  const r = size / 2 - size * 0.2 - dot / 2;
  const cx = x + size / 2;
  const cy = y + size / 2;
  g.fillStyle = color;
  const steps = Math.max(24, Math.round(r * 4));
  for (let k = 0; k < steps; k++) {
    const a = (k / steps) * Math.PI * 2;
    g.fillRect(Math.round(cx + Math.cos(a) * r - dot / 2), Math.round(cy + Math.sin(a) * r - dot / 2), dot, dot);
  }
}
