import type { AudioService, SoundName } from '../types/game';

type Wave = OscillatorType;

interface ToneSpec {
  type: Wave;
  from: number;
  to?: number;
  dur: number;
  vol?: number;
  at?: number;
}

type Voice = (engine: AudioEngine, t: number, variant: number) => number;

const MAX_PER_SOUND = 4;

function arpeggio(engine: AudioEngine, t: number, notes: number[], step: number, type: Wave = 'square', vol = 0.35): number {
  notes.forEach((f, i) => engine.tone(t, { type, from: f, dur: step * 0.95, vol, at: i * step }));
  return notes.length * step;
}

const VOICES: Record<SoundName, Voice> = {
  move: (e, t) => e.tone(t, { type: 'square', from: 880, dur: 0.03, vol: 0.2 }),
  select: (e, t) => e.tone(t, { type: 'square', from: 660, to: 990, dur: 0.08, vol: 0.3 }),
  start: (e, t) => arpeggio(e, t, [523, 659, 784, 1047], 0.06),
  eat: (e, t) => e.tone(t, { type: 'square', from: 1200, dur: 0.05, vol: 0.3 }),
  lock: (e, t) => e.tone(t, { type: 'triangle', from: 120, dur: 0.06, vol: 0.6 }),
  line: (e, t) => arpeggio(e, t, [523, 659, 784], 0.05),
  tetris: (e, t) => arpeggio(e, t, [523, 659, 784, 1047, 1319], 0.06),
  brick: (e, t, v) => e.tone(t, { type: 'square', from: 400 + Math.max(0, Math.min(4, v)) * 100, dur: 0.04, vol: 0.25 }),
  paddle: (e, t) => e.tone(t, { type: 'triangle', from: 300, dur: 0.04, vol: 0.5 }),
  shoot: (e, t) => e.tone(t, { type: 'square', from: 1200, to: 400, dur: 0.08, vol: 0.2 }),
  explode: (e, t) => e.noise(t, 0.15, 0.4),
  ufo: (e, t) => {
    e.tone(t, { type: 'sine', from: 700, to: 900, dur: 0.12, vol: 0.18 });
    return e.tone(t, { type: 'sine', from: 900, to: 700, dur: 0.12, vol: 0.18, at: 0.12 }) + 0.12;
  },
  reveal: (e, t) => e.tone(t, { type: 'triangle', from: 600, dur: 0.02, vol: 0.35 }),
  flag: (e, t) => e.tone(t, { type: 'square', from: 900, dur: 0.04, vol: 0.25 }),
  boom: (e, t) => {
    e.tone(t, { type: 'triangle', from: 90, to: 40, dur: 0.5, vol: 0.7 });
    return e.noise(t, 0.5, 0.5);
  },
  die: (e, t) => e.tone(t, { type: 'square', from: 440, to: 110, dur: 0.4, vol: 0.3 }),
  gameover: (e, t) => arpeggio(e, t, [392, 330, 262, 196], 0.14),
  record: (e, t) => arpeggio(e, t, [523, 659, 784, 1047, 784, 1047], 0.07),
  clear: (e, t) => arpeggio(e, t, [659, 784, 988, 1319], 0.08),
};

export class AudioEngine implements AudioService {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private active = new Map<SoundName, number>();
  private muted = false;
  private volume = 0.6;

  configure(muted: boolean, volume: number): void {
    this.muted = muted;
    this.volume = volume;
    this.applyGain();
  }

  isMuted(): boolean {
    return this.muted;
  }

  unlock(): void {
    if (!this.ac) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ac = new Ctor();
      this.master = this.ac.createGain();
      this.master.connect(this.ac.destination);
      this.applyGain();
    }
    if (this.ac.state === 'suspended') void this.ac.resume();
  }

  private applyGain(): void {
    if (this.master && this.ac) {
      this.master.gain.setValueAtTime(this.muted ? 0 : this.volume * 0.5, this.ac.currentTime);
    }
  }

  play(name: SoundName, variant = 0): void {
    if (this.muted || !this.ac || !this.master || this.ac.state !== 'running') return;
    const count = this.active.get(name) ?? 0;
    if (count >= MAX_PER_SOUND) return;
    this.active.set(name, count + 1);
    const duration = VOICES[name](this, this.ac.currentTime + 0.005, variant);
    window.setTimeout(() => this.active.set(name, Math.max(0, (this.active.get(name) ?? 1) - 1)), duration * 1000 + 30);
  }

  tone(t: number, spec: ToneSpec): number {
    const ac = this.ac as AudioContext;
    const start = t + (spec.at ?? 0);
    const end = start + spec.dur;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.from, start);
    if (spec.to !== undefined) osc.frequency.exponentialRampToValueAtTime(spec.to, end);
    const vol = spec.vol ?? 0.3;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + Math.min(0.01, spec.dur / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(this.master as GainNode);
    osc.start(start);
    osc.stop(end + 0.02);
    return (spec.at ?? 0) + spec.dur;
  }

  noise(t: number, dur: number, vol: number): number {
    const ac = this.ac as AudioContext;
    if (!this.noiseBuffer) {
      const len = Math.floor(ac.sampleRate * 0.6);
      this.noiseBuffer = ac.createBuffer(1, len, ac.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuffer;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(gain).connect(this.master as GainNode);
    src.start(t);
    src.stop(t + dur + 0.02);
    return dur;
  }
}
