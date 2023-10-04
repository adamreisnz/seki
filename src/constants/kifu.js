import {stoneColors} from './stone.js'
import {gameTypes} from './game.js'
import {appName, appVersion} from './app.js'
import {jgfVersion} from './jgf.js'

/**
 * Kifu formats
 */
export const kifuFormats = {
  JSON: 'json',
  JGF: 'jgf',
  SGF: 'sgf',
  GIB: 'gib',
}

/**
 * Blank JGF
 */
export const blankJgf = {
  record: {
    version: jgfVersion,
    charset: 'UTF-8',
    generator: `${appName} v${appVersion}`,
  },
  game: {
    type: gameTypes.GO,
  },
  players: [
    {
      color: stoneColors.BLACK,
      name: 'Black',
    },
    {
      color: stoneColors.WHITE,
      name: 'White',
    },
  ],
  board: {
    size: 19,
  },
  rules: {
    komi: 0,
    handicap: 0,
  },
  tree: [],
}

/**
 * Blank SGF
 */
export const blankSgf = {
  AP: `${appName} v${appVersion}`,
  CA: 'UTF-8',
  FF: '4',
  GM: '1',
  SZ: '19',
  PB: 'Black',
  PW: 'White',
}
