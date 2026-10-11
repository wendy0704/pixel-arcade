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

export const SUN = [
  '....ssss....',
  '..ssssssss..',
  '.ssssssssss.',
  '.ssssssssss.',
  'ssssssssssss',
  'ssssssssssss',
  'ssssssssssss',
  'ssssssssssss',
  '.ssssssssss.',
  '.ssssssssss.',
  '..ssssssss..',
  '....ssss....',
];

export const MOON = [
  '...mmmm...',
  '.mmmm.....',
  '.mmm......',
  'mmm.......',
  'mmm.......',
  'mmm.......',
  'mmm.......',
  '.mmm......',
  '.mmmm.....',
  '...mmmm...',
];

export const DAY = {
  sky: '#cfe6f7',
  hill: '#a6c8e0',
  line: '#4a4a78',
  dots: '#7a8aa8',
  runner: '#1b6fc2',
  cactus: '#23864a',
  bat: '#c2185b',
  text: '#2a2a48',
};

export const NIGHT = {
  sky: COLORS.bg,
  hill: '#1a1a36',
  line: COLORS.panelLight,
  dots: COLORS.muted,
  runner: COLORS.cyan,
  cactus: COLORS.green,
  bat: COLORS.pink,
  text: COLORS.text,
};
