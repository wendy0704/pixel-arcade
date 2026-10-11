import { GAMES, formatScore, type GameEntry } from '../core/registry';
import { CATEGORY_LABEL, type Category } from '../types/game';
import { h, ICONS, svgIcon } from './dom';
import { gameHref } from './router';
import type { Services } from './services';
import { SettingsPanel } from './settings-panel';

type Filter = 'all' | Category;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'action', label: CATEGORY_LABEL.action },
  { value: 'puzzle', label: CATEGORY_LABEL.puzzle },
  { value: 'shooter', label: CATEGORY_LABEL.shooter },
  { value: 'board', label: CATEGORY_LABEL.board },
];

const THUMB_W = 160;
const THUMB_H = 120;

export function filterGames(
  games: GameEntry[],
  query: string,
  filter: Filter,
  favOnly: boolean,
  favorites: string[],
): GameEntry[] {
  const q = query.trim().toLowerCase();
  const matched = games.filter(({ meta }) => {
    if (q && !meta.title.toLowerCase().includes(q) && !meta.id.includes(q)) return false;
    if (filter !== 'all' && !meta.categories.includes(filter)) return false;
    if (favOnly && !favorites.includes(meta.id)) return false;
    return true;
  });
  return [...matched].sort((a, b) => Number(favorites.includes(b.meta.id)) - Number(favorites.includes(a.meta.id)));
}

export class Lobby {
  private root: HTMLElement | null = null;
  private grid: HTMLElement | null = null;
  private empty: HTMLElement | null = null;
  private query = '';
  private filter: Filter = 'all';
  private favOnly = false;
  private settings: SettingsPanel;

  constructor(
    private container: HTMLElement,
    private services: Services,
  ) {
    this.settings = new SettingsPanel(services, () => this.renderGrid());
  }

  mount(focusId?: string): void {
    this.unmount();
    const search = h('input', {
      type: 'search',
      class: 'search',
      placeholder: '搜尋遊戲…',
      'aria-label': '搜尋遊戲',
      value: this.query,
    });
    search.addEventListener('input', () => {
      this.query = search.value;
      this.renderGrid();
    });

    const chips = FILTERS.map(({ value, label }) => {
      const chip = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(this.filter === value) }, label);
      chip.addEventListener('click', () => {
        this.filter = value;
        chips.forEach((c, i) => c.setAttribute('aria-pressed', String(FILTERS[i].value === value)));
        this.services.audio.play('move');
        this.renderGrid();
      });
      return chip;
    });

    const favToggle = h('button', { type: 'button', class: 'chip chip-fav', 'aria-pressed': String(this.favOnly) }, svgIcon(ICONS.star), '只看收藏');
    favToggle.addEventListener('click', () => {
      this.favOnly = !this.favOnly;
      favToggle.setAttribute('aria-pressed', String(this.favOnly));
      this.services.audio.play('move');
      this.renderGrid();
    });

    const settingsBtn = h(
      'button',
      { type: 'button', class: 'icon-btn settings-btn', 'aria-label': '設定' },
      svgIcon(ICONS.gear),
      h('span', { class: 'icon-btn-text' }, '設定'),
    );
    settingsBtn.addEventListener('click', () => this.settings.open());

    this.grid = h('div', { class: 'card-grid', role: 'list' });
    this.grid.addEventListener('keydown', this.onGridKey);
    this.empty = h('p', { class: 'empty', hidden: true }, '找不到符合的遊戲');

    this.root = h(
      'div',
      { class: 'lobby' },
      h(
        'header',
        { class: 'marquee' },
        h(
          'div',
          { class: 'marquee-inner' },
          h('p', { class: 'marquee-kicker pixel' }, 'INSERT COIN'),
          h('h1', { class: 'marquee-title' }, h('span', { class: 'pixel neon' }, 'PIXEL ARCADE'), h('span', { class: 'marquee-sub' }, '像素街機')),
        ),
        settingsBtn,
      ),
      h(
        'section',
        { class: 'toolbar', 'aria-label': '搜尋與篩選' },
        search,
        h('div', { class: 'chips', role: 'group', 'aria-label': '分類' }, chips, favToggle),
      ),
      h('main', { class: 'lobby-main' }, this.grid, this.empty),
      h(
        'footer',
        { class: 'lobby-footer' },
        h('p', {}, '像素街機 Pixel Arcade・向經典遊戲致敬的學習作品，與原作公司無關。'),
        h('p', {}, '字型：Press Start 2P、Fusion Pixel Font（SIL OFL 1.1）'),
      ),
    );
    this.container.append(this.root);
    this.renderGrid();
    if (focusId) this.grid.querySelector<HTMLElement>(`[data-id="${focusId}"] .card-link`)?.focus({ preventScroll: false });
  }

  unmount(): void {
    this.settings.close();
    this.root?.remove();
    this.root = null;
    this.grid = null;
    this.empty = null;
  }

  private renderGrid(): void {
    if (!this.grid || !this.empty) return;
    const { storage } = this.services;
    const favorites = storage.getFavorites();
    const games = filterGames(GAMES, this.query, this.filter, this.favOnly, favorites);
    this.grid.replaceChildren(...games.map((g) => this.card(g, favorites.includes(g.meta.id))));
    this.empty.hidden = games.length > 0;
  }

  private card(entry: GameEntry, favorite: boolean): HTMLElement {
    const { meta } = entry;
    const { storage, audio } = this.services;
    const thumb = h('canvas', { width: THUMB_W, height: THUMB_H, class: 'card-canvas', 'aria-hidden': 'true' });
    const ctx = thumb.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      meta.drawThumbnail(ctx, THUMB_W, THUMB_H);
    }
    const best = storage.getHighScore(meta.id, 'normal');
    const fav = h(
      'button',
      { type: 'button', class: 'fav', 'aria-pressed': String(favorite), 'aria-label': `收藏 ${meta.title}` },
      svgIcon(ICONS.star),
    );
    fav.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      storage.toggleFavorite(meta.id);
      audio.play('flag');
      this.renderGrid();
      this.grid?.querySelector<HTMLElement>(`[data-id="${meta.id}"] .fav`)?.focus();
    });
    return h(
      'article',
      { class: 'card', 'data-id': meta.id, role: 'listitem' },
      h('div', { class: 'card-thumb' }, thumb),
      h(
        'div',
        { class: 'card-body' },
        h('h2', { class: 'card-title' }, h('a', { class: 'card-link', href: gameHref(meta.id) }, meta.title)),
        h('p', { class: 'card-desc' }, meta.description),
        h(
          'div',
          { class: 'card-meta' },
          h('span', { class: 'tags' }, meta.categories.map((c) => h('span', { class: 'tag' }, CATEGORY_LABEL[c]))),
          h('span', { class: 'best' }, h('span', { class: 'pixel best-label' }, 'BEST'), h('span', { class: 'pixel best-value' }, best ? formatScore(meta, best.score) : '---')),
        ),
      ),
      fav,
    );
  }

  private onGridKey = (e: KeyboardEvent): void => {
    if (!this.grid) return;
    const links = [...this.grid.querySelectorAll<HTMLElement>('.card-link')];
    const index = links.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    const cols = getComputedStyle(this.grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    const delta: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    const d = delta[e.key];
    if (d === undefined) return;
    const next = links[index + d];
    e.preventDefault();
    if (next) {
      next.focus();
      this.services.audio.play('move');
    }
  };
}
