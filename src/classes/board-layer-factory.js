import GridLayer from './layers/grid-layer.js'
import ShadowLayer from './layers/shadow-layer.js'
import StoneLayer from './layers/stone-layer.js'
import ScoreLayer from './layers/score-layer.js'
import MarkupLayer from './layers/markup-layer.js'
import HoverLayer from './layers/hover-layer.js'
import {boardLayerTypes} from '../constants/board.js'

/**
 * Board layer factory class
 */
export default class BoardLayerFactory {

  /**
   * Get stone class to use
   */
  getClass(type) {
    switch (type) {
      case boardLayerTypes.GRID:
        return GridLayer
      case boardLayerTypes.SHADOW:
        return ShadowLayer
      case boardLayerTypes.STONES:
        return StoneLayer
      case boardLayerTypes.SCORE:
        return ScoreLayer
      case boardLayerTypes.MARKUP:
        return MarkupLayer
      case boardLayerTypes.HOVER:
        return HoverLayer
      default:
        throw new Error(`Unknown board layer type: ${type}`)
    }
  }

  /**
   * Create layer
   */
  create(type, ...args) {
    const LayerClass = this.getClass(type)
    return new LayerClass(...args)
  }
}
