import type { Difficulty } from '../../types/game';

export interface Card {
  icon: number;
  open: boolean;
  matched: boolean;
}

export interface MemoryState {
  cards: Card[];
  first: number | null;
  second: number | null;
  moves: number;
  pairsFound: number;
  pairs: number;
}

export type FlipResult = 'none' | 'first' | 'match' | 'mismatch';

export const CONFIG: Record<Difficulty, { cols: number; rows: number }> = {
  easy: { cols: 4, rows: 3 },
  normal: { cols: 4, rows: 4 },
  hard: { cols: 6, rows: 4 },
};

export const CARD_W = 48;
export const CARD_H = 60;
export const GAP = 8;
export const HUD = 24;

export function boardSize(cols: number, rows: number): { width: number; height: number } {
  return { width: cols * CARD_W + (cols + 1) * GAP, height: HUD + rows * CARD_H + (rows + 1) * GAP };
}

export function createDeck(pairs: number, random: () => number): number[] {
  const deck = Array.from({ length: pairs * 2 }, (_, i) => i % pairs);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function createState(pairs: number, random: () => number): MemoryState {
  return {
    cards: createDeck(pairs, random).map((icon) => ({ icon, open: false, matched: false })),
    first: null,
    second: null,
    moves: 0,
    pairsFound: 0,
    pairs,
  };
}

export function flip(state: MemoryState, index: number): FlipResult {
  const card = state.cards[index];
  if (!card || card.open || card.matched || state.second !== null) return 'none';
  card.open = true;
  if (state.first === null) {
    state.first = index;
    return 'first';
  }
  state.second = index;
  state.moves++;
  const a = state.cards[state.first];
  if (a.icon === card.icon) {
    a.matched = true;
    card.matched = true;
    state.pairsFound++;
    state.first = null;
    state.second = null;
    return 'match';
  }
  return 'mismatch';
}

export function hideMismatch(state: MemoryState): void {
  for (const i of [state.first, state.second]) if (i !== null) state.cards[i].open = false;
  state.first = null;
  state.second = null;
}

export function approach(current: number, target: number, step: number): number {
  if (current < target) return Math.min(target, current + step);
  if (current > target) return Math.max(target, current - step);
  return current;
}

export function isComplete(state: MemoryState): boolean {
  return state.pairsFound === state.pairs;
}
