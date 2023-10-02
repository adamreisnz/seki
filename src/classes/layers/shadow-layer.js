import BoardLayer from '../board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'

/**
 * Shadow layer
 */
export default class ShadowLayer extends BoardLayer {

  /**
   * Constructor
   */
  constructor(board) {

    //Parent constructor
    super(board)

    //Set type
    this.type = boardLayerTypes.SHADOW
  }

  /**
   * Remove a single stone shadow object
   */
  remove(x, y) {

    //Remove from grid and redraw the whole layer
    this.grid.delete(x, y)
    this.redraw()
  }

  /**
   * Draw layer
   */
  draw() {

    //Get data
    const {board, theme, context} = this

    //No context
    if (!context) {
      return
    }

    //Get shadowsize from theme
    const cellSize = board.getCellSize()
    const shadowSize = theme.get('shadow.size', cellSize)

    //Apply shadow transformation
    context.setTransform(1, 0, 0, 1, shadowSize, shadowSize)

    //Call parent method
    super.draw()
  }
}
