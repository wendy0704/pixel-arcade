type AttrValue = string | number | boolean | undefined | null | EventListener;
type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, AttrValue> = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      el.className = String(value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
  append(el, children);
  return el;
}

function append(el: HTMLElement, children: (Child | Child[])[]): void {
  for (const child of children) {
    if (Array.isArray(child)) append(el, child);
    else if (child === null || child === undefined || child === false) continue;
    else el.append(child instanceof Node ? child : String(child));
  }
}

export function svgIcon(markup: string): HTMLElement {
  const span = document.createElement('span');
  span.className = 'icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = markup;
  return span;
}

const svg = (body: string) =>
  `<svg viewBox="0 0 8 8" width="16" height="16" shape-rendering="crispEdges" fill="currentColor">${body}</svg>`;

export const ICONS = {
  back: svg('<rect x="1" y="3" width="6" height="2"/><rect x="2" y="2" width="1" height="1"/><rect x="2" y="5" width="1" height="1"/><rect x="3" y="1" width="1" height="1"/><rect x="3" y="6" width="1" height="1"/>'),
  pause: svg('<rect x="1" y="1" width="2" height="6"/><rect x="5" y="1" width="2" height="6"/>'),
  play: svg('<rect x="2" y="1" width="1" height="6"/><rect x="3" y="2" width="1" height="4"/><rect x="4" y="3" width="1" height="2"/><rect x="5" y="3" width="1" height="2"/>'),
  sound: svg('<rect x="0" y="3" width="2" height="2"/><rect x="2" y="2" width="1" height="4"/><rect x="3" y="1" width="1" height="6"/><rect x="5" y="2" width="1" height="1"/><rect x="5" y="5" width="1" height="1"/><rect x="6" y="3" width="1" height="2"/>'),
  mute: svg('<rect x="0" y="3" width="2" height="2"/><rect x="2" y="2" width="1" height="4"/><rect x="3" y="1" width="1" height="6"/><rect x="5" y="2" width="1" height="1"/><rect x="7" y="2" width="1" height="1"/><rect x="6" y="3" width="1" height="2"/><rect x="5" y="5" width="1" height="1"/><rect x="7" y="5" width="1" height="1"/>'),
  fullscreen: svg('<rect x="0" y="0" width="3" height="1"/><rect x="0" y="0" width="1" height="3"/><rect x="5" y="0" width="3" height="1"/><rect x="7" y="0" width="1" height="3"/><rect x="0" y="7" width="3" height="1"/><rect x="0" y="5" width="1" height="3"/><rect x="5" y="7" width="3" height="1"/><rect x="7" y="5" width="1" height="3"/>'),
  shrink: svg('<rect x="0" y="2" width="3" height="1"/><rect x="2" y="0" width="1" height="3"/><rect x="5" y="2" width="3" height="1"/><rect x="5" y="0" width="1" height="3"/><rect x="0" y="5" width="3" height="1"/><rect x="2" y="5" width="1" height="3"/><rect x="5" y="5" width="3" height="1"/><rect x="5" y="5" width="1" height="3"/>'),
  gear: svg('<rect x="3" y="0" width="2" height="1"/><rect x="3" y="7" width="2" height="1"/><rect x="0" y="3" width="1" height="2"/><rect x="7" y="3" width="1" height="2"/><rect x="1" y="1" width="6" height="6"/><rect x="3" y="3" width="2" height="2" fill="#0b0b1a"/>'),
  star: svg('<rect x="3" y="0" width="2" height="2"/><rect x="0" y="2" width="8" height="2"/><rect x="1" y="4" width="6" height="1"/><rect x="1" y="5" width="2" height="2"/><rect x="5" y="5" width="2" height="2"/><rect x="0" y="7" width="2" height="1"/><rect x="6" y="7" width="2" height="1"/>'),
};
