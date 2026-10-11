import type { GameFactory, GameMeta } from '../types/game';

export interface GameEntry {
  meta: GameMeta;
  load(): Promise<GameFactory>;
}

const metaModules = import.meta.glob<GameMeta>('../games/*/meta.ts', { eager: true, import: 'meta' });
const gameModules = import.meta.glob<GameFactory>('../games/*/game.ts', { import: 'createGame' });

const folderOf = (path: string): string => path.split('/').slice(-2)[0];

export const GAMES: GameEntry[] = Object.entries(metaModules)
  .map(([path, meta]) => {
    const folder = folderOf(path);
    const loader = gameModules[`../games/${folder}/game.ts`];
    if (!loader) throw new Error(`games/${folder} 缺少 game.ts`);
    if (meta.id !== folder) throw new Error(`games/${folder} 的 meta.id 必須與資料夾名稱相同`);
    return { meta, load: loader };
  })
  .sort((a, b) => a.meta.order - b.meta.order);

export function findGame(id: string): GameEntry | undefined {
  return GAMES.find((g) => g.meta.id === id);
}

export function formatScore(meta: GameMeta, score: number): string {
  return meta.formatScore ? meta.formatScore(score) : String(Math.round(score));
}
