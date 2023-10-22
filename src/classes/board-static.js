import Board from './board.js'
import {
  boardLayerTypes,
} from '../constants/board.js'
import {
  createCanvasContext,
} from '../helpers/util.js'

/**
 * This class represents a static Go board, used for just rendering and
 * displaying a single board position
 */
export default class BoardStatic extends Board {

  //Layer order for static boards
  layerOrder = [
    boardLayerTypes.BACKGROUND,
    boardLayerTypes.GRID,
    boardLayerTypes.COORDINATES,
    boardLayerTypes.STONES,
    boardLayerTypes.MARKUP,
  ]

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
   * Setup elements
   */
  setupElements(container) {

    //Parent setup
    super.setupElements(container)

    //Add static class
    const {board} = this.elements
    board.classList.add('seki-board-static')
  }

  /**
   * Create layer contexts
   */
  createLayerContexts() {

    //Get data
    const {elements, layers} = this
    const {canvasContainer} = elements

    //Create single canvas
    const context = createCanvasContext(
      canvasContainer, `seki-board-layer-static`,
    )

    //Link to all layers
    layers.forEach(layer => layer.setContext(context))

    //Store canvases as elements array
    elements.canvasses = Array.from(
      canvasContainer.getElementsByTagName('canvas'),
    )
  }
}
