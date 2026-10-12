import { COLORS } from '../../core/pixel';

export const PLAYER = [
  '.....cc.....',
  '.....cc.....',
  '....cwwc....',
  '....cwwc....',
  '...cccccc...',
  '...ccbbcc...',
  'c..ccbbcc..c',
  'c.cccccccc.c',
  'cccccccccccc',
  'cc.cc..cc.cc',
  '...o....o...',
  '...o....o...',
];

export const PLAYER_COLORS = { c: COLORS.cyan, w: '#ffffff', b: COLORS.blue, o: COLORS.orange };

export const DRONE = [
  '..pppppp..',
  '.pppppppp.',
  'ppkppppkpp',
  'pppppppppp',
  '.p.pppp.p.',
  'p...pp...p',
];

export const DIVER = [
  'o........o',
  'oo......oo',
  '.oo.oo.oo.',
  '..oooooo..',
  '..ookkoo..',
  '...oooo...',
  '...oooo...',
  '....oo....',
  '....oo....',
  '....yy....',
];

export const GUNSHIP = [
  '.gggg....gggg.',
  'gggggg..gggggg',
  'gggggggggggggg',
  'ggkkggggggkkgg',
  'gggggggggggggg',
  '.gggggggggggg.',
  '..gggg..gggg..',
  '...gg....gg...',
  '...rr....rr...',
];

const BOSS_HALF = [
  '......vvvvvvvvvvvvvvvvv',
  '....vvvvvvvvvvvvvvvvvvv',
  '..vvvvvvvvvvvvvvvvvvvvv',
  '.vvvvvvkkkvvvvvvvvvvvvv',
  'vvvvvvvkkkvvvvvvvvvvrrr',
  'vvvvvvvvvvvvvvvvvvvrrrr',
  'vvvvvvvvvvvvvvvvvvvrrrw',
  'vvvvvvvvvvvvvvvvvvvrrrw',
  '.vvvvvvvvvvvvvvvvvvrrrr',
  '..vvvvvvvvvvvvvvvvvvrrr',
  '...vvvv..vvvvvvvvvvvvvv',
  '...vvvv..vvvvvvvvvvvvvv',
  '...kkkk...vvvvvvvvvvvvv',
  '...kkkk.....vvvvvvvvvvv',
  '...........vvvv..vvvvvv',
  '...........kkkk...vvvvv',
  '...........kkkk.....vvv',
  '......................v',
];

export const BOSS = BOSS_HALF.map((row) => row + [...row].reverse().join(''));

export const POWER = ['.yyyy.', 'yykkyy', 'yykyyy', 'yykyyy', 'yykyyy', '.yyyy.'];
export const BOMB_ITEM = ['.pppp.', 'ppkkpp', 'ppkpkp', 'ppkkpp', 'ppkpkp', '.pkkp.'];

export const ENEMY_COLORS = {
  p: COLORS.pink,
  o: COLORS.orange,
  g: COLORS.green,
  v: COLORS.purple,
  r: COLORS.red,
  y: COLORS.gold,
  w: '#ffffff',
  k: '#0b0b1a',
};
