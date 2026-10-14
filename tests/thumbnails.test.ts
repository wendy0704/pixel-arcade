import { describe, expect, it } from 'vitest';
import type { GameMeta } from '../src/types/game';

const metas = import.meta.glob<GameMeta>('../src/games/*/meta.ts', { eager: true, import: 'meta' });

const fakeContext = () =>
  new Proxy({} as Record<string | symbol, unknown>, {
    get: (target, key) => (key in target ? target[key] : () => ({ width: 0 })),
    set: (target, key, value) => {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

describe('lobby thumbnails', () => {
  it.each(Object.values(metas).map((m) => [m.id, m] as const))('%s draws its thumbnail without errors', (_, meta) => {
    expect(() => meta.drawThumbnail(fakeContext(), 160, 120)).not.toThrow();
  });

  it('gives every game a unique id and order', () => {
    const all = Object.values(metas);
    expect(new Set(all.map((m) => m.id)).size).toBe(all.length);
    expect(new Set(all.map((m) => m.order)).size).toBe(all.length);
  });
});
