import { drawSprite, shade } from '../../core/pixel';
import { CAPACITY, type Tube } from './logic';

export const LIQUIDS = [
  '#ff4d4d',
  '#ff9f1c',
  '#ffd23f',
  '#3ddc84',
  '#00e5ff',
  '#4d7cff',
  '#b967ff',
  '#ff2e88',
  '#1e8a52',
  '#9a5b2e',
  '#9a9ab8',
  '#f0f0f0',
];

export const GLYPHS: readonly (readonly string[])[] = [
  ['.......', '..###..', '.#####.', '.#####.', '.#####.', '..###..', '.......'],
  ['...#...', '...#...', '...#...', '#######', '...#...', '...#...', '...#...'],
  ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
  ['#######', '#.....#', '#.....#', '#.....#', '#.....#', '#.....#', '#######'],
  ['...#...', '..#.#..', '.#...#.', '#.....#', '.#...#.', '..#.#..', '...#...'],
  ['.......', '...#...', '..###..', '.#####.', '#######', '.......', '.......'],
  ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...', '.......'],
  ['#.#.#.#', '.......', '#.#.#.#', '.......', '#.#.#.#', '.......', '#.#.#.#'],
  ['#######', '.......', '#######', '.......', '#######', '.......', '#######'],
  ['#.#.#.#', '#.#.#.#', '#.#.#.#', '#.#.#.#', '#.#.#.#', '#.#.#.#', '#.#.#.#'],
  ['..###..', '.#...#.', '#.....#', '#.....#', '#.....#', '.#...#.', '..###..'],
  ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
];

export const GLYPH_SIZE = 7;

export function glyphColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 0xff) + 0.587 * ((n >> 8) & 0xff) + 0.114 * (n & 0xff)) / 255;
  return lum > 0.45 ? '#0b0b1a' : '#f0f0f0';
}

export interface TubeStyle {
  segment: number;
  inner: number;
  mouth: number;
}

export const TUBE: TubeStyle = { segment: 16, inner: 18, mouth: 8 };

export const tubeHeight = (s: TubeStyle = TUBE): number => s.mouth + CAPACITY * s.segment + 4;

export function drawTube(
  g: CanvasRenderingContext2D,
  tube: Tube,
  x: number,
  y: number,
  opts: { style?: TubeStyle; rim?: string; corked?: boolean; glyphs?: boolean } = {},
): void {
  const s = opts.style ?? TUBE;
  const left = x - s.inner / 2;
  const body = s.mouth;
  const bottom = y + body + CAPACITY * s.segment;
  const glass = opts.rim ?? '#8a8ab0';
  g.fillStyle = glass;
  g.fillRect(left - 4, y, s.inner + 8, 3);
  g.fillRect(left - 2, y + 3, 2, bottom - y - 3);
  g.fillRect(left + s.inner, y + 3, 2, bottom - y - 3);
  g.fillRect(left, bottom + 2, s.inner, 2);
  g.fillRect(left - 1, bottom, 1, 3);
  g.fillRect(left + s.inner, bottom, 1, 3);
  g.fillStyle = '#121226';
  g.fillRect(left, y + 3, s.inner, bottom - y - 1);
  for (let i = 0; i < tube.length; i++) {
    const color = LIQUIDS[tube[i] % LIQUIDS.length];
    const top = bottom - (i + 1) * s.segment;
    const last = i === 0;
    g.fillStyle = color;
    g.fillRect(left, top, s.inner, s.segment + (last ? 2 : 0));
    if (last) {
      g.fillStyle = '#121226';
      g.fillRect(left, bottom + 1, 1, 1);
      g.fillRect(left + s.inner - 1, bottom + 1, 1, 1);
    }
    g.fillStyle = shade(color, 0.3);
    g.fillRect(left, top, s.inner, 1);
    if (opts.glyphs !== false) {
      drawSprite(g, GLYPHS[tube[i] % GLYPHS.length], x - 3, top + Math.floor((s.segment - GLYPH_SIZE) / 2) + 1, glyphColor(color));
    }
  }
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.fillRect(left + 2, y + 5, 2, bottom - y - 7);
  if (opts.corked) {
    g.fillStyle = '#b07a46';
    g.fillRect(left + 1, y - 4, s.inner - 2, 8);
    g.fillStyle = '#d9a46c';
    g.fillRect(left + 1, y - 4, s.inner - 2, 2);
    g.fillStyle = '#7a4e28';
    g.fillRect(left + 1, y + 2, s.inner - 2, 2);
  }
}
