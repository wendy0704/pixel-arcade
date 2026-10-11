import { h } from './dom';

export interface ModalOptions {
  dismissible?: boolean;
  onClose?: () => void;
}

export interface ModalHandle {
  close(): void;
}

let openCount = 0;

export function isModalOpen(): boolean {
  return openCount > 0;
}

export function openModal(panel: HTMLElement, options: ModalOptions = {}): ModalHandle {
  const dismissible = options.dismissible ?? true;
  const opener = document.activeElement as HTMLElement | null;
  const backdrop = h('div', { class: 'modal-backdrop' }, panel);
  let closed = false;

  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape' && dismissible) {
      e.preventDefault();
      close();
    }
  };

  const close = () => {
    if (closed) return;
    closed = true;
    openCount--;
    window.removeEventListener('keydown', onKey);
    backdrop.remove();
    opener?.focus?.();
    options.onClose?.();
  };

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop && dismissible) close();
  });
  openCount++;
  document.body.append(backdrop);
  window.addEventListener('keydown', onKey);
  if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
  const target = panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel;
  target.focus({ preventScroll: true });
  return { close };
}
