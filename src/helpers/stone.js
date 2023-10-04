import {stoneColors} from '../constants/stone.js'

/**
 * Swap a stone color
 */
export function swapColor(color) {
  if (color === stoneColors.BLACK) {
    return stoneColors.WHITE
  }
  else if (color === stoneColors.WHITE) {
    return stoneColors.BLACK
  }
}
