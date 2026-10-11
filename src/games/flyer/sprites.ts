import { COLORS } from '../../core/pixel';

export const BIRD_FRAMES: string[][] = [
  ['.....yyyy...', '...yyyyyywk.', '..yyyyyyyww.', '.wwyyyyyyyoo', 'wwwwyyyyyoo.', '.wwyyyyyyy..', '..yyyyyyy...', '....yyyy....'],
  ['.....yyyy...', '...yyyyyywk.', '..yyyyyyyww.', '..yyyyyyyyoo', '.yyyyyyyyoo.', 'wwwwyyyyyy..', '.wwyyyyyy...', '....yyyy....'],
];

export const BIRD_COLORS: Record<string, string> = {
  y: COLORS.gold,
  w: '#ffffff',
  k: COLORS.bg,
  o: COLORS.orange,
};
