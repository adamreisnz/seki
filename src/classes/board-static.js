import Board from './board.js'
import {
  boardLayerTypes,
} from '../constants/board.js'
import {
  addClass,
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
    boardLayerTypes.SHADOW,
    boardLayerTypes.STONES,
    boardLayerTypes.MARKUP,
  ]

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
    const {wrapper, board} = this.elements
    addClass(wrapper, 'seki-board-wrapper-static')
    addClass(board, 'seki-board-static')
  }

  /**
   * Create layer contexts
   *
   * NOTE: Sharing a single context causes issues when rendering markup. The
   * render function of the markup tries to clear a square of the grid, but
   * since the context is shared with the background, it also erases the
   * background itself.
   */
  // createLayerContexts() {

  //   //Get data
  //   const {elements, layers} = this
  //   const {canvasContainer} = elements

  //   //Create single canvas
  //   const context = createCanvasContext(
  //     canvasContainer, `seki-board-layer-static`,
  //   )

  //   //Link to all layers
  //   layers.forEach(layer => layer.setContext(context))

  //   //Store canvases as elements array
  //   elements.canvasses = Array.from(
  //     canvasContainer.getElementsByTagName('canvas'),
  //   )
  // }
}
