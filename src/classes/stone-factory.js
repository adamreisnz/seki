import StoneSlateShell from './objects/stone-slate-shell.js'
import StoneGlass from './objects/stone-glass.js'
import StoneMono from './objects/stone-mono.js'
import StoneShadow from './objects/stone-shadow.js'
import {stoneStyles} from '../constants/stone.js'

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
  static create(style, color, board) {
    const StoneClass = this.getClass(style)
    return new StoneClass(board, color)
  }

  /**
   * Create modified copy of existing stone
   */
  static createCopy(stone, modifierStyle) {
    const {board, stoneColor} = stone
    return new stone.constructor(board, stoneColor, modifierStyle)
  }

  /**
   * Get shadow object for stone
   */
  static createShadow(stone) {
    return new StoneShadow(stone)
  }
}
