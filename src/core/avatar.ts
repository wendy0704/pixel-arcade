export const AVATAR_SIZE = 8;
export const NAME_MAX = 12;
export const DEFAULT_NAME = 'PLAYER';
export const ERASER = '0';

export const PALETTE: Record<string, string> = {
  '1': '#e8e8f0',
  '2': '#0b0b1a',
  '3': '#ff2e88',
  '4': '#00e5ff',
  '5': '#ffd23f',
  '6': '#3ddc84',
  '7': '#ff9f1c',
  '8': '#b967ff',
  '9': '#4d7cff',
  a: '#ff4d4d',
  b: '#f2c29b',
  c: '#8a5a3c',
  d: '#8888aa',
};

export const PALETTE_KEYS = Object.keys(PALETTE);

export const BG_COLORS = ['#2a2a48', '#3a1a4e', '#12324a', '#1d3a34', '#4a2a1a', '#4a1a2a', '#0b0b1a'];

export interface AvatarData {
  pixels: string;
  bg: string;
}

export interface AvatarPreset {
  id: string;
  label: string;
  rows: string[];
}

export const PRESETS: AvatarPreset[] = [
  { id: 'robot', label: '機器人', rows: ['...dd...', '.dddddd.', '.d4dd4d.', '.dddddd.', '.d2222d.', '.dddddd.', '..d..d..', '.dd..dd.'] },
  { id: 'cat', label: '貓咪', rows: ['7......7', '77....77', '77777777', '72777727', '77777777', '777aa777', '.777777.', '..7..7..'] },
  { id: 'alien', label: '外星人', rows: ['..6..6..', '...66...', '.666666.', '66266266', '66666666', '.666666.', '..6..6..', '.6....6.'] },
  { id: 'slime', label: '史萊姆', rows: ['........', '...44...', '..4444..', '.414414.', '.442244.', '44444444', '44444444', '........'] },
  { id: 'knight', label: '騎士', rows: ['...55...', '..5dd...', '.dddddd.', '.d2222d.', '.dddddd.', '.d2dd2d.', '.dddddd.', '..dddd..'] },
  { id: 'skull', label: '骷髏', rows: ['.111111.', '11111111', '12211221', '12211221', '11111111', '.111211.', '.1.1.1..', '........'] },
  { id: 'bunny', label: '兔子', rows: ['.1....1.', '.13..31.', '.13..31.', '.111111.', '11211211', '11133111', '.111111.', '..1..1..'] },
  { id: 'bear', label: '熊', rows: ['cc....cc', 'cccccccc', 'c2cccc2c', 'cccbbccc', 'ccb22bcc', 'cccbbccc', '.cccccc.', '........'] },
  { id: 'smile', label: '笑臉', rows: ['..5555..', '.555555.', '55255255', '55555555', '55555555', '52555525', '.522225.', '..5555..'] },
  { id: 'frog', label: '青蛙', rows: ['.11..11.', '.21..21.', '66666666', '66666666', '66222266', '.666666.', '6......6', '........'] },
  { id: 'ninja', label: '忍者', rows: ['..2222..', '.222222.', '2bbbbbb2', '2b2bb2b2', '2bbbbbb2', '22222222', '.2a22a2.', '..2222..'] },
  { id: 'astronaut', label: '太空人', rows: ['..1111..', '.111111.', '11444411', '14444441', '14444441', '11444411', '.111111.', '.1d11d1.'] },
];

export function presetPixels(preset: AvatarPreset): string {
  return preset.rows.join('').replace(/\./g, ERASER);
}

export function isValidPixels(pixels: string): boolean {
  return pixels.length === AVATAR_SIZE * AVATAR_SIZE && /^[0-9a-d]+$/.test(pixels);
}

export function isValidBg(bg: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(bg);
}

export function setPixel(pixels: string, index: number, color: string): string {
  if (index < 0 || index >= pixels.length || pixels[index] === color) return pixels;
  return pixels.slice(0, index) + color + pixels.slice(index + 1);
}

export function blankPixels(): string {
  return ERASER.repeat(AVATAR_SIZE * AVATAR_SIZE);
}

export function normalizeName(raw: string): string {
  return Array.from(raw.replace(/\s+/g, ' ').trim()).slice(0, NAME_MAX).join('');
}

export function randomAvatar(random: () => number): AvatarData {
  const preset = PRESETS[Math.min(PRESETS.length - 1, Math.floor(random() * PRESETS.length))];
  const bg = BG_COLORS[Math.min(BG_COLORS.length - 1, Math.floor(random() * BG_COLORS.length))];
  return { pixels: presetPixels(preset), bg };
}

export function matchPreset(pixels: string): AvatarPreset | undefined {
  return PRESETS.find((p) => presetPixels(p) === pixels);
}

export function drawAvatar(ctx: CanvasRenderingContext2D, avatar: AvatarData, cell: number, margin = 0): void {
  const total = (AVATAR_SIZE + margin * 2) * cell;
  ctx.fillStyle = avatar.bg;
  ctx.fillRect(0, 0, total, total);
  for (let i = 0; i < avatar.pixels.length; i++) {
    const color = PALETTE[avatar.pixels[i]];
    if (!color) continue;
    ctx.fillStyle = color;
    ctx.fillRect(((i % AVATAR_SIZE) + margin) * cell, (Math.floor(i / AVATAR_SIZE) + margin) * cell, cell, cell);
  }
}
