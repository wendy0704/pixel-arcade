import {
  AVATAR_SIZE,
  BG_COLORS,
  blankPixels,
  DEFAULT_NAME,
  drawAvatar,
  ERASER,
  matchPreset,
  NAME_MAX,
  PALETTE,
  PALETTE_KEYS,
  PRESETS,
  presetPixels,
  randomAvatar,
  setPixel,
} from '../core/avatar';
import type { ProfileDraft } from '../core/storage';
import type { AudioService } from '../types/game';
import { avatarCanvas, renderAvatar } from './avatar-view';
import { h } from './dom';

const CELL = 24;

export interface ProfileEditor {
  el: HTMLElement;
  value(): ProfileDraft;
}

export function createProfileEditor(initial: ProfileDraft, audio: AudioService): ProfileEditor {
  let pixels = initial.pixels;
  let bg = initial.bg;
  let color = '1';
  let painting = false;

  const preview = avatarCanvas({ pixels, bg }, 88, 'avatar-lg');
  const nameInput = h('input', {
    type: 'text',
    class: 'text-input',
    id: 'profile-name',
    maxlength: NAME_MAX,
    placeholder: DEFAULT_NAME,
    value: initial.name,
    autocomplete: 'off',
    enterkeyhint: 'done',
  });

  const board = h('canvas', {
    width: AVATAR_SIZE * CELL,
    height: AVATAR_SIZE * CELL,
    class: 'pe-board',
    'aria-label': '頭像畫板，點擊或拖曳來上色',
  });

  const presetButtons = PRESETS.map((preset) => {
    const btn = h('button', { type: 'button', class: 'preset-btn', 'aria-label': preset.label, title: preset.label }, avatarCanvas({ pixels: presetPixels(preset), bg }, 44));
    btn.addEventListener('click', () => {
      pixels = presetPixels(preset);
      audio.play('select');
      refresh();
    });
    return btn;
  });

  const colorButtons = [ERASER, ...PALETTE_KEYS].map((key) => {
    const btn = h('button', {
      type: 'button',
      class: key === ERASER ? 'swatch swatch-eraser' : 'swatch',
      style: key === ERASER ? undefined : `background:${PALETTE[key]}`,
      'aria-label': key === ERASER ? '橡皮擦' : `顏色 ${PALETTE[key]}`,
    });
    btn.addEventListener('click', () => {
      color = key;
      audio.play('move');
      refreshTools();
    });
    return { key, btn };
  });

  const bgButtons = BG_COLORS.map((c) => {
    const btn = h('button', { type: 'button', class: 'swatch swatch-bg', style: `background:${c}`, 'aria-label': `背景 ${c}` });
    btn.addEventListener('click', () => {
      bg = c;
      audio.play('move');
      refresh();
    });
    return { c, btn };
  });

  const clearBtn = h('button', { type: 'button', class: 'btn btn-small' }, '清空');
  clearBtn.addEventListener('click', () => {
    pixels = blankPixels();
    audio.play('flag');
    refresh();
  });
  const randomBtn = h('button', { type: 'button', class: 'btn btn-small' }, '隨機');
  randomBtn.addEventListener('click', () => {
    const r = randomAvatar(Math.random);
    pixels = r.pixels;
    bg = r.bg;
    audio.play('select');
    refresh();
  });

  const drawBoard = () => {
    const ctx = board.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    drawAvatar(ctx, { pixels, bg }, CELL);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 1; i < AVATAR_SIZE; i++) {
      ctx.fillRect(i * CELL, 0, 1, AVATAR_SIZE * CELL);
      ctx.fillRect(0, i * CELL, AVATAR_SIZE * CELL, 1);
    }
  };

  const refreshTools = () => {
    colorButtons.forEach(({ key, btn }) => btn.setAttribute('aria-pressed', String(key === color)));
    bgButtons.forEach(({ c, btn }) => btn.setAttribute('aria-pressed', String(c === bg)));
    const active = matchPreset(pixels);
    presetButtons.forEach((btn, i) => btn.setAttribute('aria-pressed', String(PRESETS[i] === active)));
  };

  const refresh = () => {
    renderAvatar(preview, { pixels, bg });
    presetButtons.forEach((btn, i) => {
      const c = btn.querySelector('canvas');
      if (c) renderAvatar(c, { pixels: presetPixels(PRESETS[i]), bg });
    });
    drawBoard();
    refreshTools();
  };

  const paintAt = (e: PointerEvent) => {
    const rect = board.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * AVATAR_SIZE);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * AVATAR_SIZE);
    if (col < 0 || row < 0 || col >= AVATAR_SIZE || row >= AVATAR_SIZE) return;
    const next = setPixel(pixels, row * AVATAR_SIZE + col, color);
    if (next === pixels) return;
    pixels = next;
    audio.play('reveal');
    refresh();
  };

  board.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    painting = true;
    board.setPointerCapture(e.pointerId);
    paintAt(e);
  });
  board.addEventListener('pointermove', (e) => {
    if (painting) paintAt(e);
  });
  const stop = () => {
    painting = false;
  };
  board.addEventListener('pointerup', stop);
  board.addEventListener('pointercancel', stop);
  board.addEventListener('lostpointercapture', stop);

  const el = h(
    'div',
    { class: 'profile-editor' },
    h(
      'div',
      { class: 'pe-head' },
      preview,
      h('div', { class: 'pe-name' }, h('label', { class: 'pe-label', for: 'profile-name' }, `名字（最多 ${NAME_MAX} 字）`), nameInput),
    ),
    h('section', { class: 'pe-section' }, h('h3', { class: 'pe-label' }, '選擇角色（可以再自己修改）'), h('div', { class: 'preset-grid' }, presetButtons)),
    h(
      'section',
      { class: 'pe-section' },
      h('h3', { class: 'pe-label' }, '自己畫'),
      h(
        'div',
        { class: 'pe-draw' },
        board,
        h(
          'div',
          { class: 'pe-tools' },
          h('div', { class: 'swatches', role: 'group', 'aria-label': '畫筆顏色' }, colorButtons.map((c) => c.btn)),
          h('div', { class: 'pe-tool-row' }, clearBtn, randomBtn),
        ),
      ),
    ),
    h('section', { class: 'pe-section' }, h('h3', { class: 'pe-label' }, '背景色'), h('div', { class: 'swatches swatches-bg', role: 'group', 'aria-label': '背景色' }, bgButtons.map((b) => b.btn))),
  );

  refresh();

  return {
    el,
    value: () => ({ name: nameInput.value, pixels, bg }),
  };
}
