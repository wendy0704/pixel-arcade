import { COLORS } from '../../core/pixel';

export const RUN_FRAMES: string[][] = [
  [
    '...cccccc...',
    '..cccccccc..',
    '..cwkcccwk..',
    '..cccccccc..',
    '..cccppccc..',
    '...cccccc...',
    '..cccccccc..',
    '.c.cccccc.c.',
    '.c.cccccc.c.',
    '...cccccc...',
    '...cc..cc...',
    '..cc....cc..',
    '..c......c..',
    '.cc......cc.',
  ],
  [
    '...cccccc...',
    '..cccccccc..',
    '..cwkcccwk..',
    '..cccccccc..',
    '..cccppccc..',
    '...cccccc...',
    '..cccccccc..',
    '.c.cccccc.c.',
    '.c.cccccc.c.',
    '...cccccc...',
    '....cccc....',
    '....c..c....',
    '....c..c....',
    '...cc..cc...',
  ],
];

export const DUCK_FRAME = [
  '..cccccccccc....',
  '.cccccccccccc...',
  '.cccwkccccwkcc..',
  'cccccccccccccccc',
  'cccccppccccccc..',
  '.cccccccccccc...',
  '..cc......cc....',
  '..c........c....',
  '.cc........cc...',
];

export const RUNNER_COLORS: Record<string, string> = { c: COLORS.cyan, w: '#ffffff', k: COLORS.bg, p: COLORS.pink };

export const CACTUS_S = ['...gg...', '..gggg..', 'g.gggg..', 'g.gggg.g', 'gggggg.g', '..gggggg', '..gggg..', '..gggg..', '..gggg..', '..gggg..', '..gggg..', '..gggg..', '..gggg..', '..gggg..', '..gggg..', '..gggg..'];

export const CACTUS_L = [
  '....gggg....',
  '...gggggg...',
  '...gggggg...',
  'gg.gggggg...',
  'gg.gggggg.gg',
  'gg.gggggg.gg',
  'gg.gggggg.gg',
  'gggggggggggg',
  '.ggggggggggg',
  '...gggggg.gg',
  '...gggggg...',
  '...gggggg...',
  '...gggggg...',
  '...gggggg...',
  '...gggggg...',
  '...gggggg...',
  '...gggggg...',
  '...gggggg...',
  '...gggggg...',
  '...gggggg...',
  '...gggggg...',
  '...gggggg...',
  '...gggggg...',
  '...gggggg...',
];

export const BAT_FRAMES: string[][] = [
  ['b............b', 'bb..........bb', 'bbb..bbbb..bbb', '.bbbbbbbbbbbb.', '..bbbwbbwbbb..', '...bbbbbbbb...', '....bbbbbb....', '.....b..b.....', '..............', '..............'],
  ['..............', '..............', '.....bbbb.....', '...bbbbbbbb...', '..bbbwbbwbbb..', '.bbbbbbbbbbbb.', 'bbb.bbbbbb.bbb', 'bb...b..b...bb', 'b............b', '..............'],
];
