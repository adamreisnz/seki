import {stoneColors} from '../constants/stone.js'

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
  UNKNOWN: stoneColors.EMPTY,
  BLACK_STONE: stoneColors.BLACK,
  WHITE_STONE: stoneColors.WHITE,
  BLACK_CANDIDATE: stoneColors.BLACK * 2,
  WHITE_CANDIDATE: stoneColors.WHITE * 2,
  NEUTRAL: stoneColors.BLACK * 3,
}

/**
 * Repeating positions check types
 */
export const checkRepeatTypes = {
  KO: 'KO',
  ALL: 'ALL',
}

/**
 * Default game config
 */
export const defaultGameConfig = {

  //Default size of board
  defaultSize: 0,

  //Default komi and handicap
  defaultKomi: 0,
  defaultHandicap: 0,

  //Remember last selected variation when traversing nodes
  rememberPath: true,

  //Check for repeating positions?
  checkRepeat: checkRepeatTypes.KO,

  //Allow suicide?
  allowSuicide: false,
}
