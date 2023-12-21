import {stoneColors} from './stone.js'

//Score types
export const scoreTypes = {
  TERRITORY_BLACK: `territory_${stoneColors.BLACK}`,
  TERRITORY_WHITE: `territory_${stoneColors.WHITE}`,
  TERRITORY_NEUTRAL: 'neutral',
}

//Possible score states
export const scoreStates = {
  UNKNOWN: 0,
  BLACK_STONE: 1,
  WHITE_STONE: -1,
  BLACK_CANDIDATE: 2,
  WHITE_CANDIDATE: -2,
  NEUTRAL: 3,
}
