import Board from './board.js'
import {
  boardLayerTypes,
} from '../constants/board.js'
import {
  createCanvasContext,
} from '../helpers/canvas.js'

/**
 * This class represents a static Go board, used for just rendering and
 * displaying a single board position
 */
export default class StaticBoard extends Board {

  /**
   * Initialize properties
   */
  init() {

    //Parent init
    super.init()

    //Different layer order
    this.layerOrder = [
      boardLayerTypes.GRID,
      boardLayerTypes.COORDINATES,
      boardLayerTypes.STONES,
      boardLayerTypes.MARKUP,
    ]
  }

  /**
   * Erase the whole board
   */
  erase() {

    //Erasing the stones layer is enough
    const stonesLayer = this.layers.get(boardLayerTypes.STONES)
    stonesLayer.erase()
  }

  /**
   * Single layer ops not possible for static board
   */
  eraseLayer() {}
  redrawLayer() {}

  /**
   * Redraw after a color swap
   */
  redrawAfterColorSwap() {
    this.redraw()
  }

  /**
   * Apply element classes
   */
  applyClasses(element) {
    super.applyClasses(element)
    element.classList.add('seki-board-static')
  }

  /**
   * Render layers
   */
  renderLayers(element) {

    //Create single canvas and link to all relevant layers
    const context = createCanvasContext(element, 'static')
    this.layers.forEach(layer => layer.setContext(context))
  }

  /**
   * Link the board to a HTML element
   */
  linkElement(element) {
    this.element = element
    this.playerElement = null
    this.sizingElement = element
  }
}
