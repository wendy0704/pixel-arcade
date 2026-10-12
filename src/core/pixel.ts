export const COLORS = {
  bg: '#0b0b1a',
  panel: '#1a1a2e',
  panelLight: '#2a2a48',
  pink: '#ff2e88',
  cyan: '#00e5ff',
  gold: '#ffd23f',
  text: '#e8e8f0',
  muted: '#8888aa',
  red: '#ff4d4d',
  green: '#3ddc84',
  purple: '#b967ff',
  orange: '#ff9f1c',
  blue: '#4d7cff',
} as const;

export const PIXEL_FONT = '"Press Start 2P", monospace';

export interface TextOptions {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
}

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, opts: TextOptions = {}): void {
  ctx.font = `${opts.size ?? 8}px ${PIXEL_FONT}`;
  ctx.fillStyle = opts.color ?? COLORS.text;
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = opts.baseline ?? 'top';
  ctx.fillText(text, Math.round(x), Math.round(y));
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  rows: readonly string[],
  x: number,
  y: number,
  color: string | Record<string, string>,
  scale = 1,
): void {
  const ox = Math.round(x);
  const oy = Math.round(y);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.' || ch === ' ') continue;
      ctx.fillStyle = typeof color === 'string' ? color : (color[ch] ?? COLORS.text);
      ctx.fillRect(ox + c * scale, oy + r * scale, scale, scale);
    }
  }
}

export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const v = (n >> shift) & 0xff;
    const out = amount >= 0 ? v + (255 - v) * amount : v * (1 + amount);
    return Math.round(Math.min(255, Math.max(0, out)));
  };
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

export function drawBevel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, edge = 2): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = shade(color, 0.35);
  ctx.fillRect(x, y, w, edge);
  ctx.fillRect(x, y, edge, h);
  ctx.fillStyle = shade(color, -0.4);
  ctx.fillRect(x, y + h - edge, w, edge);
  ctx.fillRect(x + w - edge, y, edge, h);
}

export function clear(ctx: CanvasRenderingContext2D, width: number, height: number, color: string = COLORS.bg): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
}

export function mixColor(from: string, to: string, t: number): string {
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const k = Math.max(0, Math.min(1, t));
  const ch = (shift: number) => Math.round(((a >> shift) & 0xff) + ((((b >> shift) & 0xff) - ((a >> shift) & 0xff)) * k));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

export function drawDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, color: string): void {
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  ctx.fillStyle = color;
  for (let dy = -radius; dy < radius; dy++) {
    const half = Math.round(Math.sqrt(radius * radius - (dy + 0.5) * (dy + 0.5)));
    if (half > 0) ctx.fillRect(x0 - half, y0 + dy, half * 2, 1);
  }
}
