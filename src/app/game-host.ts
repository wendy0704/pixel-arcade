import { computeScale, getContext, toLogical } from '../core/canvas';
import { GameLoop } from '../core/game-loop';
import { findGame, formatScore, type GameEntry } from '../core/registry';
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  type Difficulty,
  type Game,
  type GameContext,
  type GameFactory,
  type GameResult,
  type PointerInfo,
} from '../types/game';
import { avatarCanvas } from './avatar-view';
import { isModalOpen, openModal } from './modal';
import { buildSettingsSection } from './settings-panel';
import { h, ICONS, svgIcon } from './dom';
import { OverlayLayer } from './overlays';
import { goToLobby } from './router';
import type { Services } from './services';
import { createVirtualPad, type VirtualPad } from './virtual-pad';

type HostState = 'idle' | 'loading' | 'title' | 'playing' | 'paused' | 'over';

const LONG_PRESS_MS = 400;
const LONG_PRESS_SLOP = 10;
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

const isTextTarget = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');

export class GameHost {
  private root: HTMLElement | null = null;
  private entry: GameEntry | null = null;
  private factory: GameFactory | null = null;
  private game: Game | null = null;
  private state: HostState = 'idle';
  private difficulty: Difficulty = 'normal';
  private session = 0;
  private loop: GameLoop;

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private stage!: HTMLElement;
  private overlay!: OverlayLayer;
  private scoreEl!: HTMLElement;
  private bestEl!: HTMLElement;
  private diffEl!: HTMLElement;
  private pauseBtn!: HTMLButtonElement;
  private muteBtn!: HTMLButtonElement;
  private fsBtn!: HTMLButtonElement;
  private rotateHint!: HTMLElement;
  private pad: VirtualPad | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private longPress = { timer: 0, id: -1, startX: 0, startY: 0, x: 0, y: 0 };
  private lastScoreText = '';

  constructor(
    private container: HTMLElement,
    private services: Services,
  ) {
    this.loop = new GameLoop(
      (dt) => this.step(dt),
      () => this.draw(),
    );
  }

  get currentId(): string | null {
    return this.entry?.meta.id ?? null;
  }

  async mount(id: string): Promise<void> {
    this.unmount();
    const entry = findGame(id);
    if (!entry) {
      goToLobby();
      return;
    }
    const session = ++this.session;
    this.entry = entry;
    this.difficulty = this.services.storage.getLastDifficulty(id) ?? 'normal';
    this.build(entry);
    document.title = `${entry.meta.title}｜像素街機 Pixel Arcade`;
    document.body.classList.add('in-game');
    this.setState('loading');
    this.overlay.show(h('div', { class: 'panel panel-loading' }, h('p', { class: 'pixel blink' }, 'LOADING...')));
    this.loop.start();

    try {
      const factory = await entry.load();
      if (session !== this.session) return;
      this.factory = factory;
      this.prepare();
      this.showTitle();
    } catch {
      if (session !== this.session) return;
      this.overlay.show(
        h(
          'div',
          { class: 'panel' },
          h('h2', { class: 'panel-heading' }, '載入失敗'),
          h('p', { class: 'panel-desc' }, '遊戲載入失敗，請檢查網路連線後重新整理。'),
          h('div', { class: 'panel-actions' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => goToLobby() }, '返回大廳')),
        ),
      );
    }
  }

  unmount(): void {
    if (!this.root) return;
    this.session++;
    this.loop.stop();
    this.game?.destroy();
    this.game = null;
    this.factory = null;
    this.overlay.detach();
    window.removeEventListener('keydown', this.onKey);
    document.removeEventListener('visibilitychange', this.onVisibility);
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.cancelLongPress();
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    this.root.remove();
    this.root = null;
    this.entry = null;
    this.pad = null;
    this.state = 'idle';
    this.services.input.reset();
    document.body.classList.remove('in-game');
    document.title = '像素街機 Pixel Arcade';
  }

  private build(entry: GameEntry): void {
    const { meta } = entry;
    this.canvas = h('canvas', { class: 'game-canvas', tabindex: -1, 'aria-label': `${meta.title} 遊戲畫面` });
    this.ctx = getContext(this.canvas);
    const layer = h('div', { class: 'overlay-layer' });
    this.overlay = new OverlayLayer(layer, this.services.audio);
    this.rotateHint = h('p', { class: 'rotate-hint', hidden: true }, '建議將手機轉為橫向，畫面會比較大');
    this.stage = h('main', { class: 'stage' }, this.canvas, layer, this.rotateHint);

    this.scoreEl = h('span', { class: 'value pixel' }, '0');
    this.bestEl = h('span', { class: 'value pixel' }, '---');
    this.diffEl = h('span', { class: 'diff-badge' }, DIFFICULTY_LABEL[this.difficulty]);
    this.pauseBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': '暫停（P）' }, svgIcon(ICONS.pause));
    this.pauseBtn.addEventListener('click', () => (this.state === 'paused' ? this.resume() : this.pause()));
    this.muteBtn = h('button', { type: 'button', class: 'icon-btn' });
    this.muteBtn.addEventListener('click', () => this.toggleMute());
    this.renderMute();
    const settingsBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': '遊戲設定' }, svgIcon(ICONS.gear));
    settingsBtn.addEventListener('click', () => this.openSettings());
    this.fsBtn = h('button', { type: 'button', class: 'icon-btn fs-btn' });
    this.fsBtn.addEventListener('click', () => this.toggleFullscreen());
    this.renderFullscreen(false);
    const backBtn = h('button', { type: 'button', class: 'icon-btn back-btn', 'aria-label': '返回大廳' }, svgIcon(ICONS.back), h('span', { class: 'icon-btn-text' }, '大廳'));
    backBtn.addEventListener('click', () => goToLobby());

    this.pad = createVirtualPad(meta.padLayout, meta.padLabels, this.services.input);

    this.root = h(
      'div',
      { class: 'game-page', 'data-game': meta.id },
      h(
        'header',
        { class: 'game-bar' },
        h('div', { class: 'bar-left' }, backBtn, h('h1', { class: 'game-title' }, meta.title, this.diffEl)),
        h(
          'div',
          { class: 'scoreboard', 'aria-live': 'off' },
          h('div', { class: 'score-item' }, h('span', { class: 'label pixel' }, 'SCORE'), this.scoreEl),
          h('div', { class: 'score-item best-item' }, h('span', { class: 'label pixel' }, 'BEST'), this.bestEl),
        ),
        h('div', { class: 'bar-right' }, this.barAvatar(), this.pauseBtn, this.muteBtn, settingsBtn, this.fsBtn),
      ),
      this.stage,
      this.pad?.el,
    );
    this.container.append(this.root);

    this.overlay.attach();
    window.addEventListener('keydown', this.onKey);
    document.addEventListener('visibilitychange', this.onVisibility);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(this.stage);
    this.bindPointer();
  }

  private prepare(): void {
    if (!this.entry || !this.factory) return;
    this.game?.destroy();
    const { meta } = this.entry;
    const { width, height } = meta.size(this.difficulty);
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = getContext(this.canvas);
    this.diffEl.textContent = DIFFICULTY_LABEL[this.difficulty];
    this.setScore(0);
    this.renderBest();

    const game = this.factory();
    const context: GameContext = {
      ctx: this.ctx,
      width,
      height,
      difficulty: this.difficulty,
      input: this.services.input,
      audio: this.services.audio,
      random: Math.random,
      setScore: (score) => {
        if (this.game === game) this.setScore(score);
      },
      finish: (result) => {
        if (this.game === game) this.handleFinish(result);
      },
    };
    this.game = game;
    game.init(context);
    this.pad?.reset();
    this.services.input.reset();
    this.fit();
  }

  private step(dt: number): void {
    if (this.state === 'playing' && this.game) this.game.update(dt);
    this.services.input.endStep();
  }

  private draw(): void {
    if (this.game && this.state !== 'loading' && this.state !== 'idle') this.game.render();
  }

  private setState(state: HostState): void {
    this.state = state;
    if (!this.root) return;
    this.root.dataset.state = state;
    const canToggle = state === 'playing' || state === 'paused';
    this.pauseBtn.disabled = !canToggle;
    this.pauseBtn.replaceChildren(svgIcon(state === 'paused' ? ICONS.play : ICONS.pause));
    this.pauseBtn.setAttribute('aria-label', state === 'paused' ? '繼續（P）' : '暫停（P）');
  }

  private start(): void {
    if (!this.game) return;
    this.services.input.reset();
    this.services.audio.play('start');
    this.overlay.hide();
    this.setState('playing');
    this.canvas.focus({ preventScroll: true });
  }

  private pause(): void {
    if (this.state !== 'playing') return;
    this.setState('paused');
    this.services.audio.play('select');
    this.showPause();
  }

  private resume(): void {
    if (this.state !== 'paused') return;
    this.overlay.hide();
    this.services.input.reset();
    this.setState('playing');
  }

  private restart(): void {
    this.prepare();
    this.start();
  }

  private handleFinish(result: GameResult): void {
    if (this.state !== 'playing' || !this.entry) return;
    const { meta } = this.entry;
    this.setState('over');
    const isNew = result.completed && this.services.storage.submitScore(meta.id, this.difficulty, result.score, meta.scoreOrder);
    this.setScore(result.score);
    this.renderBest();
    const headline = result.headline ?? 'GAME OVER';
    this.services.audio.play(isNew ? 'record' : headline === 'GAME OVER' ? 'gameover' : 'clear');
    this.showOver(result, headline, isNew);
  }

  private setScore(score: number): void {
    if (!this.entry) return;
    const text = formatScore(this.entry.meta, score);
    if (text !== this.lastScoreText) {
      this.lastScoreText = text;
      this.scoreEl.textContent = text;
    }
  }

  private renderBest(): void {
    if (!this.entry) return;
    const best = this.services.storage.getHighScore(this.entry.meta.id, this.difficulty);
    this.bestEl.textContent = best ? formatScore(this.entry.meta, best.score) : '---';
  }

  private selectDifficulty(d: Difficulty, buttons: HTMLButtonElement[]): void {
    if (!this.entry) return;
    this.difficulty = d;
    this.services.storage.setLastDifficulty(this.entry.meta.id, d);
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(DIFFICULTIES[i] === d)));
    this.services.audio.play('move');
    this.prepare();
  }

  private showTitle(): void {
    if (!this.entry) return;
    const { meta } = this.entry;
    this.setState('title');
    const diffButtons: HTMLButtonElement[] = DIFFICULTIES.map((d) =>
      h('button', { type: 'button', class: 'btn chip', 'aria-pressed': String(d === this.difficulty) }, DIFFICULTY_LABEL[d]),
    );
    diffButtons.forEach((b, i) => b.addEventListener('click', () => this.selectDifficulty(DIFFICULTIES[i], diffButtons)));
    const startBtn = h('button', { type: 'button', class: 'btn btn-primary btn-start' }, h('span', { class: 'pixel blink' }, 'PRESS START'));
    startBtn.addEventListener('click', () => this.start());
    const panel = h(
      'div',
      { class: 'panel panel-title' },
      h('h2', { class: 'panel-heading' }, meta.title),
      h('p', { class: 'panel-desc' }, meta.description),
      h(
        'table',
        { class: 'controls' },
        h(
          'tbody',
          {},
          meta.controls.map((c) => h('tr', {}, h('th', { scope: 'row' }, c.keys), h('td', {}, c.action))),
        ),
      ),
      meta.touchHint && h('p', { class: 'touch-hint' }, `觸控：${meta.touchHint}`),
      h('div', { class: 'diff-row', role: 'group', 'aria-label': '難度' }, h('span', { class: 'diff-label' }, '難度'), diffButtons),
      startBtn,
      h('p', { class: 'key-hint' }, '方向鍵選擇・Enter 確認・P 暫停・M 靜音・F 全螢幕'),
    );
    this.overlay.show(panel, '.btn-start');
  }

  private showPause(): void {
    const panel = h(
      'div',
      { class: 'panel' },
      h('h2', { class: 'panel-heading pixel' }, 'PAUSED'),
      h(
        'div',
        { class: 'panel-actions vertical' },
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => this.resume() }, '繼續'),
        h('button', { type: 'button', class: 'btn', onclick: () => this.restart() }, '重新開始'),
        h('button', { type: 'button', class: 'btn', onclick: () => goToLobby() }, '返回大廳'),
      ),
      h('p', { class: 'key-hint' }, 'P 繼續・R 重新開始'),
    );
    this.overlay.show(panel);
  }

  private showOver(result: GameResult, headline: string, isNew: boolean): void {
    if (!this.entry) return;
    const { meta } = this.entry;
    const best = this.services.storage.getHighScore(meta.id, this.difficulty);
    const panel = h(
      'div',
      { class: 'panel panel-over' },
      h('h2', { class: `panel-heading pixel ${headline === 'GAME OVER' ? 'is-over' : 'is-clear'}` }, headline),
      isNew && h('p', { class: 'new-record pixel blink' }, 'NEW RECORD!'),
      isNew && this.recordHolder(),
      h(
        'dl',
        { class: 'result' },
        h('dt', {}, meta.scoreLabel),
        h('dd', { class: 'pixel' }, formatScore(meta, result.score)),
        h('dt', {}, `最佳紀錄（${DIFFICULTY_LABEL[this.difficulty]}）`),
        h('dd', { class: 'pixel' }, best ? formatScore(meta, best.score) : '---'),
      ),
      !result.completed && h('p', { class: 'panel-desc' }, '本局未完成，不列入紀錄。'),
      h(
        'div',
        { class: 'panel-actions vertical' },
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => this.restart() }, '再玩一次'),
        h('button', { type: 'button', class: 'btn', onclick: () => this.backToTitle() }, '更換難度'),
        h('button', { type: 'button', class: 'btn', onclick: () => goToLobby() }, '返回大廳'),
      ),
    );
    this.overlay.show(panel);
  }

  private openSettings(): void {
    if (isModalOpen()) return;
    this.pause();
    const closeBtn = h('button', { type: 'button', class: 'btn btn-primary' }, '關閉');
    const panel = h(
      'div',
      { class: 'panel modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'game-settings-title' },
      h('h2', { id: 'game-settings-title', class: 'panel-heading' }, '遊戲設定'),
      buildSettingsSection(this.services, () => this.renderBest()),
      h('div', { class: 'panel-actions dialog-actions' }, closeBtn),
    );
    const handle = openModal(panel, { onClose: () => this.renderMute() });
    closeBtn.addEventListener('click', () => handle.close());
  }

  private barAvatar(): HTMLElement | null {
    const profile = this.services.storage.getProfile();
    if (!profile) return null;
    const el = avatarCanvas(profile, 28, 'bar-avatar');
    el.setAttribute('title', profile.name);
    return el;
  }

  private recordHolder(): HTMLElement {
    const profile = this.services.storage.getProfile();
    return h(
      'p',
      { class: 'record-holder' },
      profile && avatarCanvas(profile, 24),
      `${profile?.name ?? 'PLAYER'} 刷新了紀錄！`,
    );
  }

  private backToTitle(): void {
    this.prepare();
    this.showTitle();
  }

  private fit(): void {
    if (!this.root) return;
    const rect = this.stage.getBoundingClientRect();
    const compact = this.root.classList.contains('is-fs') || window.matchMedia('(pointer: coarse) and (orientation: landscape) and (max-height: 500px)').matches;
    const margin = compact ? 4 : 16;
    const scale = computeScale(rect.width - margin, rect.height - margin, this.canvas.width, this.canvas.height);
    this.canvas.style.width = `${Math.floor(this.canvas.width * scale)}px`;
    this.canvas.style.height = `${Math.floor(this.canvas.height * scale)}px`;
    const portraitTouch = window.matchMedia('(pointer: coarse) and (orientation: portrait)').matches;
    this.rotateHint.hidden = !(scale < 1.5 && portraitTouch && this.canvas.width > this.canvas.height);
  }

  private toggleMute(): void {
    this.services.applySettings({ muted: !this.services.audio.isMuted() });
    this.renderMute();
  }

  private renderMute(): void {
    const muted = this.services.audio.isMuted();
    this.muteBtn.replaceChildren(svgIcon(muted ? ICONS.mute : ICONS.sound));
    this.muteBtn.setAttribute('aria-label', muted ? '取消靜音（M）' : '靜音（M）');
    this.muteBtn.setAttribute('aria-pressed', String(muted));
  }

  private toggleFullscreen(): void {
    if (!this.root) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }
    if (this.root.classList.contains('pseudo-fs')) {
      this.setPseudoFullscreen(false);
      return;
    }
    const root = this.root;
    if (document.fullscreenEnabled && root.requestFullscreen) {
      root.requestFullscreen().catch(() => this.setPseudoFullscreen(true));
    } else {
      this.setPseudoFullscreen(true);
    }
  }

  private setPseudoFullscreen(on: boolean): void {
    if (!this.root) return;
    this.root.classList.toggle('pseudo-fs', on);
    this.root.classList.toggle('is-fs', on);
    this.renderFullscreen(on);
    window.scrollTo(0, 0);
    this.fit();
  }

  private renderFullscreen(on: boolean): void {
    this.fsBtn.replaceChildren(svgIcon(on ? ICONS.shrink : ICONS.fullscreen));
    this.fsBtn.setAttribute('aria-label', on ? '離開全螢幕（F）' : '全螢幕（F）');
    this.fsBtn.setAttribute('aria-pressed', String(on));
  }

  private onFullscreenChange = (): void => {
    if (!this.root) return;
    const on = document.fullscreenElement === this.root;
    this.root.classList.toggle('is-fs', on);
    this.renderFullscreen(on);
    this.fit();
  };

  private onVisibility = (): void => {
    if (document.hidden) this.pause();
  };

  private onKey = (e: KeyboardEvent): void => {
    if (isModalOpen() || isTextTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (SCROLL_KEYS.has(e.code)) e.preventDefault();
    if (this.state === 'playing' && this.game?.onKey?.(e.key)) {
      e.preventDefault();
      return;
    }
    if (e.repeat) return;
    switch (e.code) {
      case 'KeyP':
      case 'Escape':
        if (this.state === 'playing') this.pause();
        else if (this.state === 'paused') this.resume();
        break;
      case 'KeyR':
        if (this.state === 'paused' || this.state === 'over') this.restart();
        break;
      case 'KeyM':
        this.toggleMute();
        break;
      case 'KeyF':
        this.toggleFullscreen();
        break;
    }
  };

  private bindPointer(): void {
    const c = this.canvas;
    const dispatch = (type: PointerInfo['type'], e: PointerEvent | { clientX: number; clientY: number; button: number; pointerType: string }) => {
      if (this.state !== 'playing' || !this.game?.onPointer) return;
      const { x, y } = toLogical(c, e.clientX, e.clientY);
      this.game.onPointer({
        type,
        x,
        y,
        button: e.button === 2 ? 'secondary' : 'primary',
        pointerType: e.pointerType === 'touch' ? 'touch' : e.pointerType === 'pen' ? 'pen' : 'mouse',
      });
    };
    c.addEventListener('pointerdown', (e) => {
      if (this.state !== 'playing') return;
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      dispatch('down', e);
      if (e.pointerType !== 'mouse') {
        this.cancelLongPress();
        const lp = this.longPress;
        lp.id = e.pointerId;
        lp.startX = lp.x = e.clientX;
        lp.startY = lp.y = e.clientY;
        lp.timer = window.setTimeout(() => {
          lp.timer = 0;
          dispatch('longpress', { clientX: lp.startX, clientY: lp.startY, button: 0, pointerType: 'touch' });
        }, LONG_PRESS_MS);
      }
    });
    c.addEventListener('pointermove', (e) => {
      const lp = this.longPress;
      if (lp.timer && e.pointerId === lp.id && Math.hypot(e.clientX - lp.startX, e.clientY - lp.startY) > LONG_PRESS_SLOP) {
        this.cancelLongPress();
      }
      dispatch('move', e);
    });
    c.addEventListener('pointerup', (e) => {
      if (e.pointerId === this.longPress.id) this.cancelLongPress();
      dispatch('up', e);
    });
    c.addEventListener('pointercancel', () => this.cancelLongPress());
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private cancelLongPress(): void {
    if (this.longPress.timer) window.clearTimeout(this.longPress.timer);
    this.longPress.timer = 0;
    this.longPress.id = -1;
  }
}
