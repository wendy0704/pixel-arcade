import { COLORS } from '../../core/pixel';

export const ALIENS: [string[], string[]][] = [
  [
    ['....XXXX....', '..XXXXXXXX..', '.XX..XX..XX.', '.XXXXXXXXXX.', '..X.XXXX.X..', '.X...XX...X.', 'X..........X', '.X........X.'],
    ['....XXXX....', '..XXXXXXXX..', '.XX..XX..XX.', '.XXXXXXXXXX.', '..X.XXXX.X..', '..X..XX..X..', '..X......X..', '...X....X...'],
  ],
  [
    ['...XX..XX...', '....XXXX....', '..XXXXXXXX..', '.XX.X..X.XX.', '.XXXXXXXXXX.', '..XXX..XXX..', '.X.X....X.X.', 'X..........X'],
    ['...XX..XX...', '....XXXX....', '..XXXXXXXX..', '.XX.X..X.XX.', '.XXXXXXXXXX.', '..XXX..XXX..', '..X.X..X.X..', '..X......X..'],
  ],
  [
    ['...XXXXXX...', '.XXXXXXXXXX.', 'XXX.XXXX.XXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', '.X.XX..XX.X.', 'X..X....X..X', '.X..X..X..X.'],
    ['...XXXXXX...', '.XXXXXXXXXX.', 'XXX.XXXX.XXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', '.X.XX..XX.X.', '.X.X....X.X.', 'X...X..X...X'],
  ],
];

export const ALIEN_COLORS = [COLORS.pink, COLORS.cyan, COLORS.cyan, COLORS.green, COLORS.green];

export const alienType = (row: number) => (row === 0 ? 0 : row <= 2 ? 1 : 2);

export const PLAYER = [
  '......X......',
  '.....XXX.....',
  '....XX.XX....',
  '...XXXXXXX...',
  '..XX.XXX.XX..',
  '.XXXXXXXXXXX.',
  'XX..XX.XX..XX',
  'X...........X',
];

export const UFO = [
  '......XXXX......',
  '.....XGGGGX.....',
  '..XXXXXXXXXXXX..',
  '.XX.XX.XX.XX.XX.',
  'XXXXXXXXXXXXXXXX',
  '...XX......XX...',
];

export const EXPLOSION = [
  'X...X..X...X',
  '.X..X..X..X.',
  '..X......X..',
  'XX...XX...XX',
  '..X......X..',
  '.X..X..X..X.',
  'X...X..X...X',
  '............',
];

export const ENEMY_BULLET: [string[], string[]] = [
  ['X..', '.X.', '..X', '.X.', 'X..', '.X.'],
  ['..X', '.X.', 'X..', '.X.', '..X', '.X.'],
];
