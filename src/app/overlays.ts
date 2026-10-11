import type { AudioService } from '../types/game';

const NAV_PREV = new Set(['ArrowUp', 'ArrowLeft']);
const NAV_NEXT = new Set(['ArrowDown', 'ArrowRight']);
const ACTIVATE = new Set(['Enter', 'NumpadEnter', 'Space']);

export class OverlayLayer {
  private visible = false;

  constructor(
    private layer: HTMLElement,
    private audio: AudioService,
  ) {
    this.layer.hidden = true;
  }

  attach(): void {
    window.addEventListener('keydown', this.onKey);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKey);
  }

  isVisible(): boolean {
    return this.visible;
  }

  show(panel: HTMLElement, focusSelector = '.btn-primary'): void {
    this.layer.replaceChildren(panel);
    this.layer.hidden = false;
    this.visible = true;
    const target = panel.querySelector<HTMLElement>(focusSelector) ?? panel.querySelector<HTMLElement>('button');
    target?.focus({ preventScroll: true });
  }

  hide(): void {
    this.layer.hidden = true;
    this.visible = false;
    this.layer.replaceChildren();
  }

  private buttons(): HTMLButtonElement[] {
    return [...this.layer.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
  }

  private onKey = (e: KeyboardEvent): void => {
    if (!this.visible || e.altKey || e.ctrlKey || e.metaKey) return;
    const buttons = this.buttons();
    if (buttons.length === 0) return;
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (NAV_PREV.has(e.code) || NAV_NEXT.has(e.code)) {
      e.preventDefault();
      const delta = NAV_NEXT.has(e.code) ? 1 : -1;
      const next = current < 0 ? 0 : (current + delta + buttons.length) % buttons.length;
      buttons[next].focus({ preventScroll: true });
      this.audio.play('move');
    } else if (ACTIVATE.has(e.code)) {
      e.preventDefault();
      if (e.repeat) return;
      (current >= 0 ? buttons[current] : buttons[0]).click();
    }
  };
}
