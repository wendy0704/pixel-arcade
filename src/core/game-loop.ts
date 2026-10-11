export const STEP = 1 / 60;
export const MAX_FRAME = 0.25;

export function advance(accumulator: number, elapsed: number, step = STEP): { steps: number; accumulator: number } {
  let acc = accumulator + Math.min(Math.max(elapsed, 0), MAX_FRAME);
  let steps = 0;
  while (acc >= step) {
    acc -= step;
    steps++;
  }
  return { steps, accumulator: acc };
}

export class GameLoop {
  private raf = 0;
  private last = 0;
  private accumulator = 0;
  private running = false;

  constructor(
    private update: (dt: number) => void,
    private render: () => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.accumulator = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const result = advance(this.accumulator, (now - this.last) / 1000);
    this.last = now;
    this.accumulator = result.accumulator;
    for (let i = 0; i < result.steps; i++) this.update(STEP);
    this.render();
    this.raf = requestAnimationFrame(this.frame);
  };
}
