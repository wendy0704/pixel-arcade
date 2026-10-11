import type { InputManager } from '../core/input';
import type { Action, PadLabels, PadLayout } from '../types/game';
import { h } from './dom';

export interface VirtualPad {
  el: HTMLElement;
  reset(): void;
}

function holdButton(input: InputManager, action: Action, text: string, cls: string, label: string): HTMLButtonElement {
  const btn = h('button', { type: 'button', class: `vbtn ${cls}`, 'aria-label': label }, text);
  let held = false;
  const release = () => {
    if (!held) return;
    held = false;
    btn.classList.remove('active');
    input.press(action, false);
  };
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (held) return;
    held = true;
    btn.setPointerCapture(e.pointerId);
    btn.classList.add('active');
    input.press(action, true);
  });
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('lostpointercapture', release);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  return btn;
}

function abCluster(input: InputManager, labels: PadLabels | undefined, withB: boolean): HTMLElement {
  return h(
    'div',
    { class: 'vpad-ab' },
    withB &&
      h('div', { class: 'vbtn-wrap' }, holdButton(input, 'secondary', 'B', 'vbtn-round vbtn-b', `B ${labels?.b ?? ''}`), h('span', { class: 'vbtn-caption' }, labels?.b ?? '')),
    h('div', { class: 'vbtn-wrap' }, holdButton(input, 'primary', 'A', 'vbtn-round vbtn-a', `A ${labels?.a ?? ''}`), h('span', { class: 'vbtn-caption' }, labels?.a ?? '')),
  );
}

export function createVirtualPad(layout: PadLayout, labels: PadLabels | undefined, input: InputManager): VirtualPad | null {
  if (layout === 'none') return null;

  if (layout === 'flag-toggle') {
    let on = false;
    const btn = h('button', { type: 'button', class: 'vbtn vbtn-toggle', 'aria-pressed': 'false' });
    const render = () => {
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? '目前：插旗模式（點擊切換）' : '目前：開格模式（點擊切換）';
      input.setLatched('secondary', on);
    };
    btn.addEventListener('click', () => {
      on = !on;
      render();
    });
    render();
    return {
      el: h('div', { class: 'vpad vpad-toggle' }, btn),
      reset: () => {
        on = false;
        render();
      },
    };
  }

  if (layout === 'lr-a') {
    const el = h(
      'div',
      { class: 'vpad' },
      h('div', { class: 'vpad-lr' }, holdButton(input, 'left', '◀', 'vbtn-dir', '左'), holdButton(input, 'right', '▶', 'vbtn-dir', '右')),
      abCluster(input, labels, false),
    );
    return { el, reset: () => undefined };
  }

  const el = h(
    'div',
    { class: 'vpad' },
    h(
      'div',
      { class: 'vpad-dpad' },
      holdButton(input, 'up', '▲', 'vbtn-dir d-up', '上'),
      holdButton(input, 'left', '◀', 'vbtn-dir d-left', '左'),
      holdButton(input, 'right', '▶', 'vbtn-dir d-right', '右'),
      holdButton(input, 'down', '▼', 'vbtn-dir d-down', '下'),
    ),
    (labels?.a || labels?.b) && abCluster(input, labels, Boolean(labels?.b)),
  );
  return { el, reset: () => undefined };
}
