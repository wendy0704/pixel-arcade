import '@fontsource/press-start-2p/400.css';
import '@vp-tw/cjk-web-fonts-fusion-pixel-font/dist/12px/proportional/zh_hant/Fusion-Pixel-12px-Proportional-Traditional-Chinese.css';
import './styles/base.css';
import './styles/crt.css';
import './styles/lobby.css';
import './styles/game.css';
import './styles/themes.css';

import { GameHost } from './app/game-host';
import { Lobby } from './app/lobby';
import { startRouter } from './app/router';
import type { Services } from './app/services';
import { AudioEngine } from './core/audio';
import { InputManager } from './core/input';
import { createBackend, GameStorage, type Settings } from './core/storage';

const PALETTE_FILTERS: Record<string, string[]> = {
  handheld: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  pocket: ['#1e1e1e', '#5a5a5a', '#a5a5a5', '#e6e6e6'],
  redscope: ['#000000', '#550000', '#aa0000', '#ff1a1a'],
};

const THEME_COLOR: Record<string, string> = {
  neon: '#0b0b1a',
  handheld: '#0f380f',
  pocket: '#1a1a1a',
  famicom: '#1c0c0e',
  console16: '#24222c',
  redscope: '#000000',
  cga: '#000000',
  micro8: '#000000',
  master64: '#00002a',
  colorboy: '#1b2033',
};

const COLOR_FILTERS: Record<string, string> = {
  cga: `<feColorMatrix type="matrix" values="1 0 0 0 0 -0.5 1 0.9 0 0 0 0 0 0 0 0 0 0 1 0"/>
  <feComponentTransfer>
    <feFuncR type="discrete" tableValues="0 1"/>
    <feFuncG type="discrete" tableValues="0 1"/>
  </feComponentTransfer>
  <feColorMatrix type="matrix" values="1 0.333 0 0 0 0.333 1 0 0 0 1 1 0 0 0 0 0 0 1 0"/>`,
  micro8: `<feComponentTransfer>
    <feFuncR type="discrete" tableValues="0 0.843"/>
    <feFuncG type="discrete" tableValues="0 0.843"/>
    <feFuncB type="discrete" tableValues="0 0.843"/>
  </feComponentTransfer>`,
  master64: `<feComponentTransfer>
    <feFuncR type="discrete" tableValues="0 0.333 0.667 1"/>
    <feFuncG type="discrete" tableValues="0 0.333 0.667 1"/>
    <feFuncB type="discrete" tableValues="0 0.333 0.667 1"/>
  </feComponentTransfer>`,
  colorboy: `<feColorMatrix type="saturate" values="1.5"/>
  <feComponentTransfer>
    <feFuncR type="discrete" tableValues="0.106 0.36 0.64 0.88 1"/>
    <feFuncG type="discrete" tableValues="0.125 0.4 0.68 0.9 0.97"/>
    <feFuncB type="discrete" tableValues="0.2 0.44 0.62 0.78 0.84"/>
  </feComponentTransfer>`,
};

function installPaletteFilters(): void {
  const channel = (hexes: string[], shift: number) =>
    hexes.map((hex) => (((parseInt(hex.slice(1), 16) >> shift) & 0xff) / 255).toFixed(3)).join(' ');
  const filters = Object.entries(PALETTE_FILTERS)
    .map(
      ([id, hexes]) => `<filter id="pal-${id}" color-interpolation-filters="sRGB">
  <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0"/>
  <feComponentTransfer>
    <feFuncR type="gamma" amplitude="1" exponent="0.6" offset="0"/>
    <feFuncG type="gamma" amplitude="1" exponent="0.6" offset="0"/>
    <feFuncB type="gamma" amplitude="1" exponent="0.6" offset="0"/>
  </feComponentTransfer>
  <feComponentTransfer>
    <feFuncR type="discrete" tableValues="${channel(hexes, 16)}"/>
    <feFuncG type="discrete" tableValues="${channel(hexes, 8)}"/>
    <feFuncB type="discrete" tableValues="${channel(hexes, 0)}"/>
  </feComponentTransfer>
</filter>`,
    )
    .concat(Object.entries(COLOR_FILTERS).map(([id, body]) => `<filter id="pal-${id}" color-interpolation-filters="sRGB">${body}</filter>`))
    .join('');
  const holder = document.createElement('div');
  holder.setAttribute('aria-hidden', 'true');
  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">${filters}</svg>`;
  document.body.append(holder);
}

function applyAppearance(settings: Settings): void {
  const body = document.body;
  body.classList.toggle('crt', settings.crt);
  body.classList.toggle('pad-left', settings.leftHanded);
  body.classList.toggle('pad-small', settings.padSize === 'small');
  body.classList.toggle('pad-large', settings.padSize === 'large');
  document.documentElement.dataset.theme = settings.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[settings.theme] ?? '#0b0b1a');
  window.dispatchEvent(new CustomEvent('pa:settings'));
}

async function waitForFonts(): Promise<void> {
  if (!('fonts' in document)) return;
  const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, 1500));
  const load = Promise.all([
    document.fonts.load('8px "Press Start 2P"'),
    document.fonts.load('12px "Fusion Pixel 12px Proportional Traditional Chinese"', '像素街機'),
  ]).then(() => undefined);
  await Promise.race([load, timeout]).catch(() => undefined);
}

async function bootstrap(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  const { backend, persistent } = createBackend();
  const storage = new GameStorage(backend, persistent);
  const audio = new AudioEngine();
  const input = new InputManager();
  const initial = storage.getSettings();
  audio.configure(initial.muted, initial.volume);
  installPaletteFilters();
  applyAppearance(initial);
  input.attach();

  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });

  const services: Services = {
    storage,
    audio,
    input,
    applySettings(patch): Settings {
      const next = storage.updateSettings(patch);
      audio.configure(next.muted, next.volume);
      applyAppearance(next);
      return next;
    },
  };

  await waitForFonts();

  const lobby = new Lobby(app, services);
  const host = new GameHost(app, services);

  startRouter((route) => {
    if (route.name === 'game') {
      lobby.unmount();
      void host.mount(route.id);
    } else {
      const lastId = host.currentId ?? undefined;
      host.unmount();
      lobby.mount(lastId);
    }
    window.scrollTo(0, 0);
  });
}

void bootstrap();
