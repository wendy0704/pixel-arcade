import { describe, expect, it } from 'vitest';
import { clampPan, distance, IDENTITY, MAX_ZOOM, midpoint, pinchZoom, settle } from '../src/core/zoom';

const base = { x: 100, y: 50 };

describe('pinch zoom', () => {
  it('measures fingers', () => {
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('scales by the change in finger distance and keeps the pinched point under the fingers', () => {
    const start = { state: { ...IDENTITY }, mid: { x: 200, y: 150 }, dist: 100 };
    const z = pinchZoom(start, { x: 200, y: 150 }, 200, base, 400, 400);
    expect(z.scale).toBe(2);
    expect(base.x + z.tx + z.scale * 100).toBeCloseTo(200);
    expect(base.y + z.ty + z.scale * 100).toBeCloseTo(150);
  });

  it('pans with the midpoint of the two fingers', () => {
    const start = { state: { scale: 2, tx: -200, ty: -200 }, mid: { x: 300, y: 250 }, dist: 100 };
    const z = pinchZoom(start, { x: 260, y: 230 }, 100, base, 400, 400);
    expect(z.scale).toBe(2);
    expect(z.tx).toBeCloseTo(-240);
    expect(z.ty).toBeCloseTo(-220);
  });

  it('never shrinks below the original size or beyond the maximum', () => {
    const start = { state: { ...IDENTITY }, mid: { x: 200, y: 150 }, dist: 100 };
    expect(pinchZoom(start, start.mid, 10, base, 400, 400)).toEqual(IDENTITY);
    expect(pinchZoom(start, start.mid, 10000, base, 400, 400).scale).toBe(MAX_ZOOM);
  });

  it('keeps the board covering its original box', () => {
    expect(clampPan({ scale: 2, tx: 50, ty: -900 }, 400, 400)).toEqual({ scale: 2, tx: 0, ty: -400 });
  });

  it('snaps back to the normal size when barely zoomed', () => {
    expect(settle({ scale: 1.03, tx: -5, ty: -5 })).toEqual(IDENTITY);
    expect(settle({ scale: 1.5, tx: -5, ty: -5 })).toEqual({ scale: 1.5, tx: -5, ty: -5 });
  });
});
