import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, GameStorage, isBetter, KEYS, MemoryBackend } from '../src/core/storage';

const make = () => {
  const backend = new MemoryBackend();
  return { backend, storage: new GameStorage(backend, true, () => '2026-10-15') };
};

describe('isBetter', () => {
  it('higher order prefers bigger scores', () => {
    expect(isBetter(10, undefined, 'higher')).toBe(true);
    expect(isBetter(10, 5, 'higher')).toBe(true);
    expect(isBetter(5, 10, 'higher')).toBe(false);
    expect(isBetter(10, 10, 'higher')).toBe(false);
  });

  it('lower order prefers smaller scores', () => {
    expect(isBetter(30.5, 40, 'lower')).toBe(true);
    expect(isBetter(50, 40, 'lower')).toBe(false);
  });

  it('rejects non finite scores', () => {
    expect(isBetter(Number.NaN, undefined, 'higher')).toBe(false);
  });

  it('does not record a zero score for higher-is-better games', () => {
    expect(isBetter(0, undefined, 'higher')).toBe(false);
  });
});

describe('GameStorage', () => {
  it('returns defaults when nothing is stored', () => {
    const { storage } = make();
    expect(storage.getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(storage.getFavorites()).toEqual([]);
    expect(storage.getHighScore('snake', 'normal')).toBeUndefined();
  });

  it('recovers from corrupted JSON', () => {
    const { backend, storage } = make();
    backend.setItem(KEYS.settings, '{not json');
    backend.setItem(KEYS.highscores, '[1,2,3]');
    expect(storage.getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(storage.getHighScores()).toEqual({});
    expect(JSON.parse(backend.getItem(KEYS.settings)!)).toEqual(DEFAULT_SETTINGS);
  });

  it('rejects settings with the wrong shape', () => {
    const { backend, storage } = make();
    backend.setItem(KEYS.settings, JSON.stringify({ version: 1, muted: 'yes', volume: 2, crt: true }));
    expect(storage.getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('fills in new settings for data saved by older versions', () => {
    const { backend, storage } = make();
    backend.setItem(KEYS.settings, JSON.stringify({ version: 1, muted: true, volume: 0.3, crt: false }));
    expect(storage.getSettings()).toEqual({ ...DEFAULT_SETTINGS, muted: true, volume: 0.3, crt: false });
  });

  it('ignores unknown values for the new settings', () => {
    const { backend, storage } = make();
    backend.setItem(KEYS.settings, JSON.stringify({ ...DEFAULT_SETTINGS, padSize: 'huge', theme: 'rainbow', scaleMode: 3, leftHanded: 'yes' }));
    expect(storage.getSettings()).toEqual(DEFAULT_SETTINGS);
    storage.updateSettings({ padSize: 'large', theme: 'handheld', scaleMode: 'integer', leftHanded: true, countdown: true });
    expect(storage.getSettings()).toMatchObject({ padSize: 'large', theme: 'handheld', scaleMode: 'integer', leftHanded: true, countdown: true });
  });

  it('updates settings and clamps volume', () => {
    const { storage } = make();
    storage.updateSettings({ muted: true, volume: 3 });
    expect(storage.getSettings()).toMatchObject({ muted: true, volume: 1 });
  });

  it('toggles favourites', () => {
    const { storage } = make();
    expect(storage.toggleFavorite('snake')).toBe(true);
    expect(storage.isFavorite('snake')).toBe(true);
    expect(storage.toggleFavorite('snake')).toBe(false);
    expect(storage.getFavorites()).toEqual([]);
  });

  it('records high scores per game and difficulty', () => {
    const { storage } = make();
    expect(storage.submitScore('snake', 'normal', 100, 'higher')).toBe(true);
    expect(storage.submitScore('snake', 'normal', 80, 'higher')).toBe(false);
    expect(storage.submitScore('snake', 'hard', 50, 'higher')).toBe(true);
    expect(storage.getHighScore('snake', 'normal')).toEqual({ score: 100, date: '2026-10-15' });
    expect(storage.getHighScore('snake', 'hard')?.score).toBe(50);
  });

  it('records lower-is-better times', () => {
    const { storage } = make();
    storage.submitScore('minesweeper', 'easy', 42.1, 'lower');
    expect(storage.submitScore('minesweeper', 'easy', 50, 'lower')).toBe(false);
    expect(storage.submitScore('minesweeper', 'easy', 30.4, 'lower')).toBe(true);
    expect(storage.getHighScore('minesweeper', 'easy')?.score).toBe(30.4);
  });

  it('clears high scores', () => {
    const { storage } = make();
    storage.submitScore('snake', 'normal', 100, 'higher');
    storage.clearHighScores();
    expect(storage.getHighScores()).toEqual({});
  });

  it('remembers the last difficulty', () => {
    const { storage } = make();
    storage.setLastDifficulty('blocks', 'hard');
    expect(storage.getLastDifficulty('blocks')).toBe('hard');
    expect(storage.getLastDifficulty('snake')).toBeUndefined();
  });

  it('keeps working when the backend throws on write', () => {
    const backend = new MemoryBackend();
    backend.setItem = () => {
      throw new Error('QuotaExceeded');
    };
    const storage = new GameStorage(backend, true);
    expect(() => storage.submitScore('snake', 'normal', 10, 'higher')).not.toThrow();
  });
});
