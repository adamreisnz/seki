import {stoneColors} from './stone.js'
import {appName, appVersion} from './app.js'
import {jgfVersion} from './jgf.js'

/**
 * Game types
 */
export const gameTypes = {
  GO: 'go',
  OTHELLO: 'othello',
  CHESS: 'chess',
  RENJU: 'renju',
  BACKGAMMON: 'backgammon',
  CHINESE_CHESS: 'chinese_chess',
  SHOGI: 'shogi',
  UNKNOWN: 'unknown',
}

/**
 * Possible score states
 */
export const scoreState = {
  UNKNOWN: 0,
  BLACK_STONE: 1,
  WHITE_STONE: -1,
  BLACK_CANDIDATE: 2,
  WHITE_CANDIDATE: -2,
  NEUTRAL: 3,
}

/**
 * Repeating positions check types
 */
export const checkRepeatTypes = {
  KO: 'ko',
  ALL: 'all',
}

/**
 * Default game info
 */
export const defaultGameInfo = {
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
}
