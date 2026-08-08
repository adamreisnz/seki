import Board from './board.js'
import {
  boardLayerTypes
} from '../constants/board.js'
import {
  addClass
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

  //NOTE: eraseLayer and redrawLayer used to be stubbed out here, on the basis
  //that single layer operations were not possible for a static board. That was
  //true of the shared context idea below, which was abandoned, and each layer
  //has had its own context ever since. Stubbing them meant the shadow layer
  //was never cleared when the position was replaced, since StonesLayer#setAll
  //erases it through eraseLayer, and the grid was never redrawn underneath
  //new markup.

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
