import { h } from './dom';
import type { Services } from './services';

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
      h('dd', {}, toggle(settings.crt, (on) => services.applySettings({ crt: on }))),
      h('dt', {}, '紀錄'),
      h('dd', {}, clearBtn),
    ),
    !storage.persistent && h('p', { class: 'warn' }, '此瀏覽器無法保存紀錄（可能是無痕模式），關閉分頁後紀錄會消失。'),
    h('p', { class: 'credits' }, '字型：Press Start 2P、Fusion Pixel Font（皆為 SIL OFL 1.1 授權）。所有遊戲畫面與音效皆為程式即時產生。'),
    h('p', { class: 'credits build-time' }, `建置時間：${__BUILD_TIME__}`),
  );
}
