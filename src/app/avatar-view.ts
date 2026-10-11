import { AVATAR_SIZE, drawAvatar, type AvatarData } from '../core/avatar';
import { h } from './dom';

const MARGIN = 1;
const RES = AVATAR_SIZE + MARGIN * 2;

export function renderAvatar(canvas: HTMLCanvasElement, avatar: AvatarData): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  drawAvatar(ctx, avatar, 1, MARGIN);
}

export function avatarCanvas(avatar: AvatarData, size: number, className = ''): HTMLCanvasElement {
  const canvas = h('canvas', {
    width: RES,
    height: RES,
    class: `avatar ${className}`.trim(),
    style: `width:${size}px;height:${size}px`,
    'aria-hidden': 'true',
  });
  renderAvatar(canvas, avatar);
  return canvas;
}
