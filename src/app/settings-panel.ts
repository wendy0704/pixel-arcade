import { h } from './dom';
import type { Services } from './services';

export class SettingsPanel {
  private backdrop: HTMLElement | null = null;
  private opener: HTMLElement | null = null;

  constructor(
    private services: Services,
    private onRecordsCleared: () => void,
  ) {}

  open(): void {
    if (this.backdrop) return;
    this.opener = document.activeElement as HTMLElement | null;
    const { storage, audio } = this.services;
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
      this.services.applySettings({ volume: Number(volume.value) / 100 });
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
      this.onRecordsCleared();
    });

    const panel = h(
      'div',
      { class: 'panel modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'settings-title' },
      h('h2', { id: 'settings-title', class: 'panel-heading' }, '設定'),
      h(
        'dl',
        { class: 'settings-list' },
        h('dt', {}, '音效'),
        h('dd', {}, toggle(!settings.muted, (on) => this.services.applySettings({ muted: !on }))),
        h('dt', {}, h('label', { for: 'setting-volume' }, '音量')),
        h('dd', {}, volume),
        h('dt', {}, 'CRT 效果'),
        h('dd', {}, toggle(settings.crt, (on) => this.services.applySettings({ crt: on }))),
        h('dt', {}, '紀錄'),
        h('dd', {}, clearBtn),
      ),
      !storage.persistent && h('p', { class: 'warn' }, '此瀏覽器無法保存紀錄（可能是無痕模式），關閉分頁後紀錄會消失。'),
      h(
        'p',
        { class: 'credits' },
        '字型：Press Start 2P、Fusion Pixel Font（皆為 SIL OFL 1.1 授權）。所有遊戲畫面與音效皆為程式即時產生。',
      ),
      h('div', { class: 'panel-actions' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => this.close() }, '關閉')),
    );

    this.backdrop = h('div', { class: 'modal-backdrop' }, panel);
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });
    document.body.append(this.backdrop);
    window.addEventListener('keydown', this.onKey);
    panel.querySelector<HTMLElement>('button')?.focus();
  }

  close(): void {
    if (!this.backdrop) return;
    window.removeEventListener('keydown', this.onKey);
    this.backdrop.remove();
    this.backdrop = null;
    this.opener?.focus();
  }

  isOpen(): boolean {
    return this.backdrop !== null;
  }

  private onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Escape') {
      e.preventDefault();
      this.close();
    }
  };
}
