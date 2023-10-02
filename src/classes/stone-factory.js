import StoneSlateShell from './objects/stone-slate-shell.js'
import StoneGlass from './objects/stone-glass.js'
import StoneMono from './objects/stone-mono.js'
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
  static create(theme, ...args) {

    //Get style
    const style = theme.get('stone.style')
    const CustomClass = theme.get('stone.class')

    //Has custom class
    if (CustomClass) {
      return new CustomClass(...args)
    }

    //Get stone class
    const StoneClass = this.getClass(style)
    return new StoneClass(...args)
  }
}
