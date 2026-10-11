export function computeScale(availW: number, availH: number, width: number, height: number): number {
  if (availW <= 0 || availH <= 0) return 1;
  const raw = Math.min(availW / width, availH / height);
  return raw >= 2 ? Math.floor(raw) : Math.max(raw, 0.1);
}

export function toLogical(canvas: HTMLCanvasElement, clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) * canvas.width) / rect.width,
    y: ((clientY - rect.top) * canvas.height) / rect.height,
  };
}

export function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not supported');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}
