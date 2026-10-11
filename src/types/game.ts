export type Difficulty = 'easy' | 'normal' | 'hard';
export type Category = 'action' | 'puzzle' | 'shooter' | 'board';
export type Action = 'up' | 'down' | 'left' | 'right' | 'primary' | 'secondary';
export type ScoreOrder = 'higher' | 'lower';
export type PadLayout = 'dpad-ab' | 'lr-a' | 'a' | 'flag-toggle' | 'none';

export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '簡單', normal: '普通', hard: '困難' };
export const CATEGORY_LABEL: Record<Category, string> = { action: '動作', puzzle: '益智', shooter: '射擊', board: '棋類' };

export type SoundName =
  | 'move'
  | 'select'
  | 'start'
  | 'eat'
  | 'lock'
  | 'line'
  | 'tetris'
  | 'brick'
  | 'paddle'
  | 'shoot'
  | 'explode'
  | 'ufo'
  | 'reveal'
  | 'flag'
  | 'boom'
  | 'die'
  | 'gameover'
  | 'record'
  | 'clear';

export interface AudioService {
  play(name: SoundName, variant?: number): void;
}

export interface PadLabels {
  a?: string;
  b?: string;
}

export interface GameMeta {
  id: string;
  order: number;
  title: string;
  description: string;
  categories: Category[];
  scoreOrder: ScoreOrder;
  scoreLabel: string;
  formatScore?(score: number): string;
  controls: { keys: string; action: string }[];
  touchHint?: string;
  padLayout: PadLayout;
  padLabels?: PadLabels;
  size(difficulty: Difficulty): { width: number; height: number };
  drawThumbnail(ctx: CanvasRenderingContext2D, width: number, height: number): void;
}

export interface InputState {
  isDown(action: Action): boolean;
  wasPressed(action: Action): boolean;
}

export interface PointerInfo {
  type: 'down' | 'move' | 'up' | 'longpress';
  x: number;
  y: number;
  button: 'primary' | 'secondary';
  pointerType: 'mouse' | 'touch' | 'pen';
}

export interface GameResult {
  score: number;
  completed: boolean;
  headline?: string;
}

export interface GameContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  difficulty: Difficulty;
  input: InputState;
  audio: AudioService;
  random(): number;
  setScore(score: number): void;
  finish(result: GameResult): void;
}

export interface Game {
  init(context: GameContext): void;
  update(dt: number): void;
  render(): void;
  onPointer?(event: PointerInfo): void;
  onKey?(key: string): boolean;
  destroy(): void;
}

export type GameFactory = () => Game;
