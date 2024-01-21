import {stoneColors} from './stone.js'

//Score types
export const scoreTypes = {
  TERRITORY_BLACK: `territory_${stoneColors.BLACK}`,
  TERRITORY_WHITE: `territory_${stoneColors.WHITE}`,
  TERRITORY_NEUTRAL: 'neutral',
}

//Possible score states
export const scoreStates = {
  BLACK_STONE: stoneColors.BLACK,
  WHITE_STONE: stoneColors.WHITE,
  BLACK_CANDIDATE: `candidate_${stoneColors.BLACK}`,
  WHITE_CANDIDATE: `candidate_${stoneColors.WHITE}`,
  NEUTRAL: 'neutral',
}

//Scoring methods
export const scoringMethods = {
  AREA: 'area',
  TERRITORY: 'territory',
}
