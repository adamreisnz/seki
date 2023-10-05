import StoneSlateShell from './objects/stone-slate-shell.js'
import StoneGlass from './objects/stone-glass.js'
import StoneMono from './objects/stone-mono.js'
import StoneShadow from './objects/stone-shadow.js'
import StoneEmpty from './objects/stone-empty.js'
import {stoneStyles} from '../constants/stone.js'
import {setupTypes} from '../constants/setup.js'

/**
 * Stone factory class
 */
export default class StoneFactory {

  /**
   * Get stone class to use
   */
  static getClass(style) {
    switch (style) {
      case stoneStyles.GLASS:
        return StoneGlass
      case stoneStyles.MONO:
        return StoneMono
      case stoneStyles.SLATE_SHELL:
      default:
        return StoneSlateShell
    }
  }

  /**
   * Create stone
   */
  static create(style, color, board, data, ...args) {

    //Special class
    if (color === setupTypes.EMPTY) {
      return new StoneEmpty(board)
    }

    //Regular stones
    const StoneClass = this.getClass(style)
    return new StoneClass(board, color, data, ...args)
  }

  /**
   * Get shadow copy
   */
  static createShadowCopy(stone) {
    const {board, shadow, scale, alpha} = stone
    return new StoneShadow(board, {shadow, scale, alpha})
  }
}
