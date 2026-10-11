import type { Difficulty } from '../../types/game';

export const CONFIG: Record<Difficulty, { length: number }> = {
  easy: { length: 3 },
  normal: { length: 4 },
  hard: { length: 5 },
};

export interface Judgement {
  a: number;
  b: number;
}

export interface GuessRecord extends Judgement {
  guess: string;
}

export type GuessError = 'length' | 'repeat' | 'digits' | 'duplicate';

export function generateSecret(length: number, random: () => number): string {
  const digits = '0123456789'.split('');
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, length).join('');
}

export function validateGuess(guess: string, length: number, history: GuessRecord[] = []): GuessError | null {
  if (!/^\d*$/.test(guess)) return 'digits';
  if (guess.length !== length) return 'length';
  if (new Set(guess).size !== guess.length) return 'repeat';
  if (history.some((h) => h.guess === guess)) return 'duplicate';
  return null;
}

export function judge(secret: string, guess: string): Judgement {
  let a = 0;
  let b = 0;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secret[i]) a++;
    else if (secret.includes(guess[i])) b++;
  }
  return { a, b };
}

export function formatJudgement({ a, b }: Judgement): string {
  return `${a}A${b}B`;
}
