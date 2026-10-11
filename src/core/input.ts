import type { Action, InputState } from '../types/game';

export const KEY_MAP: Record<string, Action> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'primary',
  KeyZ: 'primary',
  KeyX: 'secondary',
};

const isTextTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

export class InputManager implements InputState {
  private keys = new Set<string>();
  private virtual = new Map<Action, number>();
  private latched = new Set<Action>();
  private pressed = new Set<Action>();

  attach(target: Window = window): void {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isTextTarget(e.target)) return;
    const action = KEY_MAP[e.code];
    if (!action || e.repeat) return;
    if (!this.isDown(action)) this.pressed.add(action);
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onBlur = (): void => {
    this.keys.clear();
    this.virtual.clear();
  };

  isDown(action: Action): boolean {
    if (this.latched.has(action) || (this.virtual.get(action) ?? 0) > 0) return true;
    for (const code of this.keys) if (KEY_MAP[code] === action) return true;
    return false;
  }

  wasPressed(action: Action): boolean {
    return this.pressed.has(action);
  }

  press(action: Action, down: boolean): void {
    const count = this.virtual.get(action) ?? 0;
    if (down) {
      if (!this.isDown(action)) this.pressed.add(action);
      this.virtual.set(action, count + 1);
    } else {
      this.virtual.set(action, Math.max(0, count - 1));
    }
  }

  setLatched(action: Action, on: boolean): void {
    if (on) this.latched.add(action);
    else this.latched.delete(action);
  }

  endStep(): void {
    this.pressed.clear();
  }

  reset(): void {
    this.pressed.clear();
    this.keys.clear();
    this.virtual.clear();
    this.latched.clear();
  }
}
