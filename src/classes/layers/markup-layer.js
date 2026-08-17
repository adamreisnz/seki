import BoardLayer from './board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'

/**
 * Markup layer
 */
export default class MarkupLayer extends BoardLayer {

  //Type
  type = boardLayerTypes.MARKUP

  /**
   * Remove all (erase layer and clear grid)
   */
  removeAll() {

    //Parent method
    super.removeAll()

    //Redraw grid layer to fill in erased gaps, if the board has one
    this.board
      .getLayer(boardLayerTypes.GRID)
      ?.redraw()
  }
}
