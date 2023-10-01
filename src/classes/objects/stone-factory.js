import StoneSlateShell from './stone-slate-shell.js'
import StoneGlass from './stone-glass.js'
import StoneMono from './stone-mono.js'
import {stoneStyles} from '../../constants/stone.js'

/**
 * Stone factory class
 */
export default class StoneFactory {

  /**
   * Construct stone factory
   */
  constructor(theme) {

    //Get style
    const style = theme.get('stone.style')
    const CustomClass = theme.get('stone.class')

    //Set class
    this.StoneClass = CustomClass || this.getClass(style)
  }

  /**
   * Get stone class to use
   */
  getClass(style) {
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
  create(...args) {
    const {StoneClass} = this
    return new StoneClass(...args)
  }
}
