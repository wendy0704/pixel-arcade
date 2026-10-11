import { DEFAULT_NAME, randomAvatar } from '../core/avatar';
import type { Profile } from '../core/storage';
import { avatarCanvas, renderAvatar } from './avatar-view';
import { h } from './dom';
import { openModal, type ModalHandle } from './modal';
import { createProfileEditor } from './profile-editor';
import type { Services } from './services';
import { buildSettingsSection } from './settings-panel';

export type PanelTab = 'profile' | 'settings';

export function openOnboarding(services: Services, onDone: (profile: Profile) => void): void {
  const start = randomAvatar(Math.random);
  const editor = createProfileEditor({ name: '', ...start }, services.audio);
  let handle: ModalHandle | null = null;
  const finish = (draft: { name: string; pixels: string; bg: string }) => {
    const profile = services.storage.saveProfile(draft);
    services.audio.play('start');
    handle?.close();
    onDone(profile);
  };
  const startBtn = h('button', { type: 'button', class: 'btn btn-primary' }, '開始遊戲');
  startBtn.addEventListener('click', () => finish(editor.value()));
  const skipBtn = h('button', { type: 'button', class: 'btn' }, '先跳過');
  skipBtn.addEventListener('click', () => finish({ name: DEFAULT_NAME, ...start }));
  const panel = h(
    'div',
    { class: 'panel modal modal-wide', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'onboarding-title' },
    h('h2', { id: 'onboarding-title', class: 'panel-heading' }, '建立玩家檔案'),
    h('p', { class: 'panel-desc' }, '選一個角色、取個名字，也可以自己畫頭像。之後隨時可以點右上角的頭貼修改。'),
    editor.el,
    h('div', { class: 'panel-actions' }, skipBtn, startBtn),
  );
  handle = openModal(panel, { dismissible: false });
}

export class PlayerPanel {
  private handle: ModalHandle | null = null;

  constructor(
    private services: Services,
    private onProfileChange: (profile: Profile) => void,
    private onRecordsCleared: () => void,
  ) {}

  open(tab: PanelTab = 'profile'): void {
    if (this.handle) return;
    const { storage, audio } = this.services;
    const current = storage.getProfile() ?? storage.saveProfile({ name: DEFAULT_NAME, ...randomAvatar(Math.random) });

    const headAvatar = avatarCanvas(current, 40);
    const headName = h('span', { class: 'player-panel-name' }, current.name);
    const body = h('div', { class: 'player-panel-body' });
    const tabs: Record<PanelTab, HTMLButtonElement> = {
      profile: h('button', { type: 'button', class: 'btn tab', role: 'tab' }, '個人檔案'),
      settings: h('button', { type: 'button', class: 'btn tab', role: 'tab' }, '遊戲設定'),
    };

    const showProfile = () => {
      const latest = storage.getProfile() ?? current;
      const editor = createProfileEditor({ name: latest.name, pixels: latest.pixels, bg: latest.bg }, audio);
      const status = h('span', { class: 'save-status', 'aria-live': 'polite' });
      const saveBtn = h('button', { type: 'button', class: 'btn btn-primary' }, '儲存');
      saveBtn.addEventListener('click', () => {
        const saved = storage.saveProfile(editor.value());
        audio.play('select');
        renderAvatar(headAvatar, saved);
        headName.textContent = saved.name;
        status.textContent = '已儲存';
        window.setTimeout(() => (status.textContent = ''), 1500);
        this.onProfileChange(saved);
      });
      body.replaceChildren(editor.el, h('div', { class: 'panel-actions' }, status, saveBtn));
    };

    const showSettings = () => {
      body.replaceChildren(buildSettingsSection(this.services, this.onRecordsCleared));
    };

    const select = (t: PanelTab) => {
      (Object.keys(tabs) as PanelTab[]).forEach((k) => tabs[k].setAttribute('aria-selected', String(k === t)));
      if (t === 'profile') showProfile();
      else showSettings();
    };
    tabs.profile.addEventListener('click', () => select('profile'));
    tabs.settings.addEventListener('click', () => select('settings'));

    const closeBtn = h('button', { type: 'button', class: 'btn' }, '關閉');
    closeBtn.addEventListener('click', () => this.close());

    const panel = h(
      'div',
      { class: 'panel modal modal-wide', role: 'dialog', 'aria-modal': 'true', 'aria-label': '玩家面板' },
      h('div', { class: 'player-panel-head' }, headAvatar, headName),
      h('div', { class: 'tabs', role: 'tablist' }, tabs.profile, tabs.settings),
      body,
      h('div', { class: 'panel-actions' }, closeBtn),
    );
    select(tab);
    this.handle = openModal(panel, { onClose: () => (this.handle = null) });
  }

  close(): void {
    this.handle?.close();
    this.handle = null;
  }
}
