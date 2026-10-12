import { COLORS } from '../../core/pixel';
import type { Persona } from './logic';

export const SLIME_FRAMES = [
  [
    '...gggg...',
    '..gggggg..',
    '.gggggggg.',
    '.gwwggwwg.',
    'ggwwggwwgg',
    'gggggggggg',
    'gggggggggg',
    'gggggggggg',
    '.gggggggg.',
    'g.g.gg.g.g',
  ],
  [
    '..........',
    '..gggggg..',
    '.gggggggg.',
    'ggwwggwwgg',
    'ggwwggwwgg',
    'gggggggggg',
    'gggggggggg',
    'gggggggggg',
    'gggggggggg',
    'gggggggggg',
  ],
];

export const EYE_SPOTS = [
  { x: 2, y: 3 },
  { x: 6, y: 3 },
];

export const BEETLE_FRAMES = [
  [
    '.l......l.',
    '..l....l..',
    '..bbbbbb..',
    '.bwkbbwkb.',
    'bbbbbbbbbb',
    'bbbbkkbbbb',
    'lbbbkkbbbl',
    'bbbbkkbbbb',
    'lbbbkkbbbl',
    '.bb....bb.',
  ],
  [
    '..l....l..',
    '.l......l.',
    '..bbbbbb..',
    '.bwkbbwkb.',
    'bbbbbbbbbb',
    'lbbbkkbbbl',
    'bbbbkkbbbb',
    'lbbbkkbbbl',
    'bbbbkkbbbb',
    '..bb..bb..',
  ],
];

export const STAR = [
  '.....y.....',
  '.....y.....',
  '....yyy....',
  '....yyy....',
  'yyyyyyyyyyy',
  '.yyyyyyyyy.',
  '..yyyyyyy..',
  '...yyyyy...',
  '...yyyyy...',
  '..yyy.yyy..',
  '..yy...yy..',
];

export const PERSONA_COLORS: Record<Persona, string> = {
  stalker: COLORS.red,
  ambusher: COLORS.purple,
  wanderer: COLORS.orange,
  shy: COLORS.pink,
};

export const FRIGHT_COLOR = '#3a4aff';
export const SLIME_COLOR = COLORS.green;
