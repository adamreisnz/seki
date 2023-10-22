import BackgroundLayer from './layers/background-layer.js'
import GridLayer from './layers/grid-layer.js'
import CoordinatesLayer from './layers/coordinates-layer.js'
import ShadowLayer from './layers/shadow-layer.js'
import StonesLayer from './layers/stones-layer.js'
import ScoreLayer from './layers/score-layer.js'
import MarkupLayer from './layers/markup-layer.js'
import DrawLayer from './layers/draw-layer.js'
import HoverLayer from './layers/hover-layer.js'
import {boardLayerTypes} from '../constants/board.js'

/**
 * Board layer factory class
 */
export default class BoardLayerFactory {

  /**
   * Get stone class to use
   */
  static getClass(type) {
    switch (type) {
      case boardLayerTypes.BACKGROUND:
        return BackgroundLayer
      case boardLayerTypes.GRID:
        return GridLayer
      case boardLayerTypes.COORDINATES:
        return CoordinatesLayer
      case boardLayerTypes.SHADOW:
        return ShadowLayer
      case boardLayerTypes.STONES:
        return StonesLayer
      case boardLayerTypes.SCORE:
        return ScoreLayer
      case boardLayerTypes.MARKUP:
        return MarkupLayer
      case boardLayerTypes.DRAW:
        return DrawLayer
      case boardLayerTypes.HOVER:
        return HoverLayer
      default:
        throw new Error(`Unknown board layer type: ${type}`)
    }
  }

  /**
   * Create layer
   */
  static create(type, ...args) {
    const LayerClass = this.getClass(type)
    return new LayerClass(...args)
  }
}
