import { PAD_SIZES, type PadSize, SCALE_MODES, type ScaleMode, type Settings, THEMES, type ThemeId } from '../core/storage';
import { h } from './dom';
import type { Services } from './services';

const PAD_LABEL: Record<PadSize, string> = { small: '小', medium: '中', large: '大' };
const SCALE_LABEL: Record<ScaleMode, string> = { integer: '整數倍', fill: '填滿' };
const SCALE_HINT: Record<ScaleMode, string> = { integer: '像素大小一致、最銳利，畫面可能小一點', fill: '畫面盡量放大，像素可能略有粗細差異' };

export const THEME_INFO: Record<ThemeId, { name: string; swatch: string[] }> = {
  neon: { name: '霓虹街機', swatch: ['#0b0b1a', '#ff2e88', '#00e5ff', '#ffd23f'] },
  handheld: { name: '綠色掌機', swatch: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'] },
  pocket: { name: '灰階口袋機', swatch: ['#1e1e1e', '#5a5a5a', '#a5a5a5', '#e6e6e6'] },
  famicom: { name: '紅白主機', swatch: ['#1c0c0e', '#d82b2b', '#e8dcc0', '#d4a83c'] },
  console16: { name: '灰紫主機', swatch: ['#24222c', '#7b6fc2', '#b6acd9', '#e6c84c'] },
  redscope: { name: '紅黑立體機', swatch: ['#000000', '#550000', '#aa0000', '#ff1a1a'] },
};

export function buildSettingsSection(services: Services, onRecordsCleared: () => void): HTMLElement {
  const { storage, audio } = services;
  const settings = storage.getSettings();

  const toggle = (initial: boolean, onChange: (on: boolean) => void) => {
    let on = initial;
    const btn = h('button', { type: 'button', class: 'btn btn-toggle', 'aria-pressed': String(on) }, on ? '開' : '關');
    btn.addEventListener('click', () => {
      on = !on;
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? '開' : '關';
      onChange(on);
    });
    return btn;
  };

  const volume = h('input', {
    type: 'range',
    min: 0,
    max: 100,
    step: 10,
    value: Math.round(settings.volume * 100),
    id: 'setting-volume',
    class: 'range',
  });
  volume.addEventListener('change', () => {
    services.applySettings({ volume: Number(volume.value) / 100 });
    audio.play('select');
  });

  const segmented = <T extends string>(options: readonly T[], current: T, label: (v: T) => string, onPick: (v: T) => void) => {
    const buttons = options.map((v) =>
      h('button', { type: 'button', class: 'btn chip', 'aria-pressed': String(v === current) }, label(v)),
    );
    buttons.forEach((b, i) =>
      b.addEventListener('click', () => {
        buttons.forEach((x, k) => x.setAttribute('aria-pressed', String(k === i)));
        onPick(options[i]);
        audio.play('move');
      }),
    );
    return h('div', { class: 'segmented', role: 'group' }, buttons);
  };

  const apply = (patch: Partial<Omit<Settings, 'version'>>) => services.applySettings(patch);

  const scaleHint = h('p', { class: 'setting-hint' }, SCALE_HINT[settings.scaleMode]);
  const scalePicker = segmented(SCALE_MODES, settings.scaleMode, (v) => SCALE_LABEL[v], (v) => {
    scaleHint.textContent = SCALE_HINT[v];
    apply({ scaleMode: v });
  });

  const themeButtons = THEMES.map((id) =>
    h(
      'button',
      { type: 'button', class: 'theme-swatch', 'aria-pressed': String(id === settings.theme), 'data-theme-id': id },
      h(
        'span',
        { class: 'swatch-colors', 'aria-hidden': 'true' },
        THEME_INFO[id].swatch.map((c) => h('span', { style: `background:${c}` })),
      ),
      h('span', { class: 'swatch-name' }, THEME_INFO[id].name),
    ),
  );
  themeButtons.forEach((b, i) =>
    b.addEventListener('click', () => {
      themeButtons.forEach((x, k) => x.setAttribute('aria-pressed', String(k === i)));
      apply({ theme: THEMES[i] });
      audio.play('select');
    }),
  );

  let confirmArmed = false;
  const clearBtn = h('button', { type: 'button', class: 'btn btn-danger' }, '清除所有最高分');
  clearBtn.addEventListener('click', () => {
    if (!confirmArmed) {
      confirmArmed = true;
      clearBtn.textContent = '再按一次確認清除';
      return;
    }
    storage.clearHighScores();
    clearBtn.textContent = '已清除';
    clearBtn.disabled = true;
    onRecordsCleared();
  });

  return h(
    'div',
    { class: 'settings-section' },
    h(
      'dl',
      { class: 'settings-list' },
      h('dt', {}, '音效'),
      h('dd', {}, toggle(!settings.muted, (on) => services.applySettings({ muted: !on }))),
      h('dt', {}, h('label', { for: 'setting-volume' }, '音量')),
      h('dd', {}, volume),
      h('dt', {}, 'CRT 效果'),
      h('dd', {}, toggle(settings.crt, (on) => apply({ crt: on }))),
      h('dt', {}, '畫面縮放'),
      h('dd', {}, scalePicker, scaleHint),
      h('dt', {}, '開局倒數'),
      h('dd', {}, toggle(settings.countdown, (on) => apply({ countdown: on }))),
      h('dt', {}, '左手模式'),
      h('dd', {}, toggle(settings.leftHanded, (on) => apply({ leftHanded: on })), h('p', { class: 'setting-hint' }, '手機虛擬按鍵的十字鍵與 A／B 鍵左右對調')),
      h('dt', {}, '按鍵大小'),
      h('dd', {}, segmented(PAD_SIZES, settings.padSize, (v) => PAD_LABEL[v], (v) => apply({ padSize: v }))),
      h('dt', {}, '主題配色'),
      h('dd', {}, h('div', { class: 'theme-grid' }, themeButtons)),
      h('dt', {}, '紀錄'),
      h('dd', {}, clearBtn),
    ),
    !storage.persistent && h('p', { class: 'warn' }, '此瀏覽器無法保存紀錄（可能是無痕模式），關閉分頁後紀錄會消失。'),
  );
}
