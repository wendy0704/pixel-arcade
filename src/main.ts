import '@fontsource/press-start-2p/400.css';
import '@vp-tw/cjk-web-fonts-fusion-pixel-font/dist/12px/proportional/zh_hant/Fusion-Pixel-12px-Proportional-Traditional-Chinese.css';
import './styles/base.css';
import './styles/crt.css';
import './styles/lobby.css';
import './styles/game.css';

import { GameHost } from './app/game-host';
import { Lobby } from './app/lobby';
import { startRouter } from './app/router';
import type { Services } from './app/services';
import { AudioEngine } from './core/audio';
import { InputManager } from './core/input';
import { createBackend, GameStorage, type Settings } from './core/storage';

function applyCrt(on: boolean): void {
  document.body.classList.toggle('crt', on);
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
  applyCrt(initial.crt);
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
      applyCrt(next.crt);
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
