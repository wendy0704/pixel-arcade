import { COLORS } from '../../core/pixel';

export const ICONS: { rows: string[]; color: string }[] = [
  { color: COLORS.red, rows: ['.XX..XX.', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..', '...XX...', '........'] },
  {
    color: COLORS.gold,
    rows: [
      '.......X.......',
      '.......X.......',
      '.......X.......',
      '......XXX......',
      '......XXX......',
      'XXXXXXXXXXXXXXX',
      '.XXXXXXXXXXXXX.',
      '...XXXXXXXXX...',
      '....XXXXXXX....',
      '....XXXXXXX....',
      '....XXXXXXX....',
      '....XXX.XXX....',
      '...XX.....XX...',
      '..XX.......XX..',
    ],
  },
  { color: COLORS.cyan, rows: ['........', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..', '...XX...', '........'] },
  { color: COLORS.orange, rows: ['........', '.XXX....', 'X...X...', 'X...XXXX', 'X...X.XX', '.XXX..X.', '........', '........'] },
  { color: COLORS.text, rows: ['.......X', '......XX', '.....XX.', 'X...XX..', '.X.XX...', '..XX....', '.XXX....', 'X..X....'] },
  { color: COLORS.blue, rows: ['..XXXX..', '.XXX....', 'XXX.....', 'XXX.....', 'XXX.....', 'XXX.....', '.XXX....', '..XXXX..'] },
  { color: COLORS.pink, rows: ['...XXXXX', '...X...X', '...X...X', '...X...X', '.XXX.XXX', 'XXXXXXXX', '.XX..XX.', '........'] },
  { color: COLORS.gold, rows: ['X..XX..X', 'XX.XX.XX', 'XXXXXXXX', 'XXXXXXXX', 'X.XXXX.X', 'XXXXXXXX', 'XXXXXXXX', '........'] },
  { color: COLORS.purple, rows: ['..XXXX..', '...XX...', '...XX...', '..XXXX..', '.XXXXXX.', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.'] },
  { color: COLORS.green, rows: ['....XXXX', '..XXXXXX', '.XXXXX.X', '.XXX.XXX', 'XXX.XXX.', 'XX.XXX..', 'X.XX....', 'X.......'] },
  { color: COLORS.gold, rows: ['....XXX.', '...XXX..', '..XXX...', '.XXXXXX.', '...XXX..', '..XXX...', '.XX.....', 'X.......'] },
  { color: COLORS.cyan, rows: ['...XX...', '..X..X..', '...XX...', 'XXXXXXXX', '...XX...', 'X..XX..X', 'XX.XX.XX', '.XXXXXX.'] },
];
