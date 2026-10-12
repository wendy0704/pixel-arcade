import { DIFFICULTIES, type Difficulty, type ScoreOrder } from '../types/game';
import { isValidBg, isValidPixels, NAME_MAX, normalizeName } from './avatar';

export type PadSize = 'small' | 'medium' | 'large';
export type ScaleMode = 'integer' | 'fill';
export type ThemeId = 'neon' | 'handheld' | 'pocket' | 'famicom' | 'console16' | 'redscope' | 'cga' | 'micro8' | 'master64' | 'colorboy';

export const PAD_SIZES: PadSize[] = ['small', 'medium', 'large'];
export const SCALE_MODES: ScaleMode[] = ['integer', 'fill'];
export const THEMES: ThemeId[] = ['neon', 'famicom', 'console16', 'cga', 'micro8', 'master64', 'colorboy', 'handheld', 'pocket', 'redscope'];

export interface Settings {
  version: 1;
  muted: boolean;
  volume: number;
  crt: boolean;
  leftHanded: boolean;
  padSize: PadSize;
  countdown: boolean;
  scaleMode: ScaleMode;
  theme: ThemeId;
}

export interface ScoreRecord {
  score: number;
  date: string;
}

export type HighScores = Record<string, Partial<Record<Difficulty, ScoreRecord>>>;

export interface Profile {
  version: 1;
  name: string;
  pixels: string;
  bg: string;
  createdAt: string;
}

export type ProfileDraft = Pick<Profile, 'name' | 'pixels' | 'bg'>;
export type LastDifficulty = Record<string, Difficulty>;

export interface KeyValueBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const KEYS = {
  settings: 'pa.settings',
  favorites: 'pa.favorites',
  highscores: 'pa.highscores',
  lastDifficulty: 'pa.lastDifficulty',
  profile: 'pa.profile',
} as const;

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  muted: false,
  volume: 0.6,
  crt: true,
  leftHanded: false,
  padSize: 'medium',
  countdown: false,
  scaleMode: 'fill',
  theme: 'neon',
};

export class MemoryBackend implements KeyValueBackend {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

export function createBackend(): { backend: KeyValueBackend; persistent: boolean } {
  try {
    const ls = window.localStorage;
    const probe = 'pa.__probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return { backend: ls, persistent: true };
  } catch {
    return { backend: new MemoryBackend(), persistent: false };
  }
}

export function isBetter(score: number, previous: number | undefined, order: ScoreOrder): boolean {
  if (!Number.isFinite(score)) return false;
  if (order === 'higher' && score <= 0) return false;
  if (previous === undefined) return true;
  return order === 'higher' ? score > previous : score < previous;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isSettings = (v: unknown): v is Pick<Settings, 'version' | 'muted' | 'volume' | 'crt'> & Record<string, unknown> =>
  isObject(v) &&
  v.version === 1 &&
  typeof v.muted === 'boolean' &&
  typeof v.crt === 'boolean' &&
  typeof v.volume === 'number' &&
  v.volume >= 0 &&
  v.volume <= 1;

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export function normalizeSettings(raw: Record<string, unknown>): Settings {
  const d = DEFAULT_SETTINGS;
  return {
    version: 1,
    muted: typeof raw.muted === 'boolean' ? raw.muted : d.muted,
    volume: typeof raw.volume === 'number' && raw.volume >= 0 && raw.volume <= 1 ? raw.volume : d.volume,
    crt: typeof raw.crt === 'boolean' ? raw.crt : d.crt,
    leftHanded: typeof raw.leftHanded === 'boolean' ? raw.leftHanded : d.leftHanded,
    padSize: pick(raw.padSize, PAD_SIZES, d.padSize),
    countdown: typeof raw.countdown === 'boolean' ? raw.countdown : d.countdown,
    scaleMode: pick(raw.scaleMode, SCALE_MODES, d.scaleMode),
    theme: pick(raw.theme, THEMES, d.theme),
  };
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

const isScoreRecord = (v: unknown): v is ScoreRecord =>
  isObject(v) && typeof v.score === 'number' && Number.isFinite(v.score) && typeof v.date === 'string';

const isHighScores = (v: unknown): v is HighScores =>
  isObject(v) &&
  Object.values(v).every(
    (perGame) =>
      isObject(perGame) &&
      Object.entries(perGame).every(([d, rec]) => DIFFICULTIES.includes(d as Difficulty) && isScoreRecord(rec)),
  );

const isProfile = (v: unknown): v is Profile =>
  isObject(v) &&
  v.version === 1 &&
  typeof v.name === 'string' &&
  v.name.trim().length > 0 &&
  Array.from(v.name).length <= NAME_MAX &&
  typeof v.pixels === 'string' &&
  isValidPixels(v.pixels) &&
  typeof v.bg === 'string' &&
  isValidBg(v.bg) &&
  typeof v.createdAt === 'string';

const isLastDifficulty = (v: unknown): v is LastDifficulty =>
  isObject(v) && Object.values(v).every((d) => DIFFICULTIES.includes(d as Difficulty));

export class GameStorage {
  constructor(
    private backend: KeyValueBackend,
    readonly persistent: boolean,
    private today: () => string = () => new Date().toISOString().slice(0, 10),
  ) {}

  private read<T>(key: string, fallback: T, validate: (v: unknown) => v is T): T {
    try {
      const raw = this.backend.getItem(key);
      if (raw === null) return fallback;
      const parsed: unknown = JSON.parse(raw);
      if (validate(parsed)) return parsed;
    } catch {
      return this.reset(key, fallback);
    }
    return this.reset(key, fallback);
  }

  private reset<T>(key: string, fallback: T): T {
    this.write(key, fallback);
    return fallback;
  }

  private write(key: string, value: unknown): void {
    try {
      this.backend.setItem(key, JSON.stringify(value));
    } catch {
      return;
    }
  }

  getSettings(): Settings {
    return normalizeSettings(this.read<Record<string, unknown>>(KEYS.settings, { ...DEFAULT_SETTINGS }, isSettings));
  }

  updateSettings(patch: Partial<Omit<Settings, 'version'>>): Settings {
    const merged = { ...this.getSettings(), ...patch, version: 1 as const };
    merged.volume = Math.min(1, Math.max(0, merged.volume));
    const next = normalizeSettings(merged);
    this.write(KEYS.settings, next);
    return next;
  }

  getFavorites(): string[] {
    return [...this.read<string[]>(KEYS.favorites, [], isStringArray)];
  }

  isFavorite(id: string): boolean {
    return this.getFavorites().includes(id);
  }

  toggleFavorite(id: string): boolean {
    const favs = this.getFavorites();
    const on = !favs.includes(id);
    this.write(KEYS.favorites, on ? [...favs, id] : favs.filter((f) => f !== id));
    return on;
  }

  getHighScores(): HighScores {
    return this.read<HighScores>(KEYS.highscores, {}, isHighScores);
  }

  getHighScore(id: string, difficulty: Difficulty): ScoreRecord | undefined {
    return this.getHighScores()[id]?.[difficulty];
  }

  submitScore(id: string, difficulty: Difficulty, score: number, order: ScoreOrder): boolean {
    const all = this.getHighScores();
    const prev = all[id]?.[difficulty];
    if (!isBetter(score, prev?.score, order)) return false;
    all[id] = { ...all[id], [difficulty]: { score, date: this.today() } };
    this.write(KEYS.highscores, all);
    return true;
  }

  clearHighScores(): void {
    this.write(KEYS.highscores, {});
  }

  getProfile(): Profile | null {
    try {
      const raw = this.backend.getItem(KEYS.profile);
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      if (isProfile(parsed)) return parsed;
    } catch {
      return null;
    }
    return null;
  }

  saveProfile(draft: ProfileDraft): Profile {
    const name = normalizeName(draft.name) || 'PLAYER';
    if (!isValidPixels(draft.pixels) || !isValidBg(draft.bg)) throw new Error('invalid avatar');
    const profile: Profile = {
      version: 1,
      name,
      pixels: draft.pixels,
      bg: draft.bg.toLowerCase(),
      createdAt: this.getProfile()?.createdAt ?? new Date().toISOString(),
    };
    this.write(KEYS.profile, profile);
    return profile;
  }

  getLastDifficulty(id: string): Difficulty | undefined {
    return this.read<LastDifficulty>(KEYS.lastDifficulty, {}, isLastDifficulty)[id];
  }

  setLastDifficulty(id: string, difficulty: Difficulty): void {
    const all = this.read<LastDifficulty>(KEYS.lastDifficulty, {}, isLastDifficulty);
    all[id] = difficulty;
    this.write(KEYS.lastDifficulty, all);
  }
}
