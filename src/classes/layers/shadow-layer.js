import BoardLayer from './board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'

/**
 * Shadow layer
 */
export default class ShadowLayer extends BoardLayer {

  //Type
  type = boardLayerTypes.SHADOW

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
    if (!context) {
      return
    }

    //Get shadow size from theme
    const cellSize = board.getCellSize()
    const shadowSize = theme.get('stone.shadow.size', cellSize)

    //Apply shadow transformation
    context.setTransform(1, 0, 0, 1, shadowSize, shadowSize)

    //Call parent method
    super.draw()
  }
}
