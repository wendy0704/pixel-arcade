import { describe, expect, it } from 'vitest';
import {
  AVATAR_SIZE,
  BG_COLORS,
  blankPixels,
  isValidBg,
  isValidPixels,
  matchPreset,
  NAME_MAX,
  normalizeName,
  PALETTE,
  PRESETS,
  presetPixels,
  randomAvatar,
  setPixel,
} from '../src/core/avatar';
import { GameStorage, KEYS, MemoryBackend } from '../src/core/storage';
import { constant, seeded } from './helpers';

describe('avatar presets', () => {
  it('has 12 presets with unique ids', () => {
    expect(PRESETS).toHaveLength(12);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(12);
  });

  it.each(PRESETS.map((p) => [p.id, p] as const))('%s is a valid 8x8 drawing using palette colours', (_, preset) => {
    expect(preset.rows).toHaveLength(AVATAR_SIZE);
    preset.rows.forEach((row) => expect(row).toHaveLength(AVATAR_SIZE));
    const pixels = presetPixels(preset);
    expect(isValidPixels(pixels)).toBe(true);
    [...pixels].filter((c) => c !== '0').forEach((c) => expect(PALETTE[c]).toBeDefined());
  });

  it('recognises an unmodified preset and not an edited one', () => {
    const pixels = presetPixels(PRESETS[3]);
    expect(matchPreset(pixels)?.id).toBe(PRESETS[3].id);
    expect(matchPreset(setPixel(pixels, 0, '5'))).toBeUndefined();
  });
});

describe('avatar editing', () => {
  it('sets a single pixel immutably', () => {
    const blank = blankPixels();
    const next = setPixel(blank, 9, 'a');
    expect(next[9]).toBe('a');
    expect(blank[9]).toBe('0');
    expect(next).toHaveLength(64);
  });

  it('ignores out-of-range indices and no-op changes', () => {
    const blank = blankPixels();
    expect(setPixel(blank, -1, '1')).toBe(blank);
    expect(setPixel(blank, 64, '1')).toBe(blank);
    expect(setPixel(blank, 3, '0')).toBe(blank);
  });

  it('validates pixel strings and background colours', () => {
    expect(isValidPixels(blankPixels())).toBe(true);
    expect(isValidPixels('0'.repeat(63))).toBe(false);
    expect(isValidPixels('z'.repeat(64))).toBe(false);
    expect(isValidBg('#12324a')).toBe(true);
    expect(isValidBg('red')).toBe(false);
  });

  it('random avatars come from the presets and background list', () => {
    const a = randomAvatar(seeded(5));
    expect(PRESETS.some((p) => presetPixels(p) === a.pixels)).toBe(true);
    expect(BG_COLORS).toContain(a.bg);
    expect(randomAvatar(constant(0.9999)).bg).toBe(BG_COLORS[BG_COLORS.length - 1]);
  });
});

describe('player names', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeName('  Blue   bu ')).toBe('Blue bu');
  });

  it('limits length by characters, not bytes', () => {
    expect(normalizeName('像素街機像素街機像素街機像素')).toHaveLength(NAME_MAX);
    expect(Array.from(normalizeName('😀'.repeat(20)))).toHaveLength(NAME_MAX);
  });
});

describe('profile storage', () => {
  const make = () => {
    const backend = new MemoryBackend();
    return { backend, storage: new GameStorage(backend, true) };
  };
  const avatar = { pixels: presetPixels(PRESETS[0]), bg: '#12324A' };

  it('returns null before a profile is created', () => {
    expect(make().storage.getProfile()).toBeNull();
  });

  it('saves and reads a profile', () => {
    const { storage } = make();
    const saved = storage.saveProfile({ name: '  Bluebu ', ...avatar });
    expect(saved).toMatchObject({ version: 1, name: 'Bluebu', bg: '#12324a' });
    expect(storage.getProfile()).toEqual(saved);
  });

  it('falls back to PLAYER for an empty name', () => {
    expect(make().storage.saveProfile({ name: '   ', ...avatar }).name).toBe('PLAYER');
  });

  it('keeps the original creation date when editing', () => {
    const { storage } = make();
    const first = storage.saveProfile({ name: 'A', ...avatar });
    const second = storage.saveProfile({ name: 'B', ...avatar });
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.name).toBe('B');
  });

  it('rejects invalid avatar data', () => {
    const { storage } = make();
    expect(() => storage.saveProfile({ name: 'A', pixels: 'bad', bg: '#000000' })).toThrow();
  });

  it('treats corrupted or tampered data as no profile', () => {
    const { backend, storage } = make();
    backend.setItem(KEYS.profile, '{oops');
    expect(storage.getProfile()).toBeNull();
    backend.setItem(KEYS.profile, JSON.stringify({ version: 1, name: 'x'.repeat(40), pixels: blankPixels(), bg: '#000000', createdAt: '' }));
    expect(storage.getProfile()).toBeNull();
  });

  it('clearing high scores keeps the profile', () => {
    const { storage } = make();
    storage.saveProfile({ name: 'A', ...avatar });
    storage.clearHighScores();
    expect(storage.getProfile()?.name).toBe('A');
  });
});
