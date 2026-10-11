import type { AudioEngine } from '../core/audio';
import type { InputManager } from '../core/input';
import type { GameStorage, Settings } from '../core/storage';

export interface Services {
  storage: GameStorage;
  audio: AudioEngine;
  input: InputManager;
  applySettings(patch: Partial<Omit<Settings, 'version'>>): Settings;
}
