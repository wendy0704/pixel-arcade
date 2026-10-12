export interface Point {
  x: number;
  y: number;
}

export interface ZoomState {
  scale: number;
  tx: number;
  ty: number;
}

export interface PinchStart {
  state: ZoomState;
  mid: Point;
  dist: number;
}

export const MAX_ZOOM = 4;
export const SNAP_BACK = 1.05;

export const IDENTITY: ZoomState = { scale: 1, tx: 0, ty: 0 };

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clampPan(state: ZoomState, width: number, height: number): ZoomState {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return {
    scale: state.scale,
    tx: clamp(state.tx, width * (1 - state.scale), 0),
    ty: clamp(state.ty, height * (1 - state.scale), 0),
  };
}

export function pinchZoom(start: PinchStart, mid: Point, dist: number, base: Point, width: number, height: number, max = MAX_ZOOM): ZoomState {
  const s0 = start.state.scale;
  const scale = Math.min(max, Math.max(1, s0 * (dist / Math.max(1, start.dist))));
  const ux = (start.mid.x - base.x - start.state.tx) / s0;
  const uy = (start.mid.y - base.y - start.state.ty) / s0;
  return clampPan({ scale, tx: mid.x - base.x - scale * ux, ty: mid.y - base.y - scale * uy }, width, height);
}

export function settle(state: ZoomState): ZoomState {
  return state.scale < SNAP_BACK ? { ...IDENTITY } : state;
}
