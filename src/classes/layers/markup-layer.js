import BoardLayer from '../board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'

/**
 * Markup layer
 */
export default class MarkupLayer extends BoardLayer {

  /**
   * Constructor
   */
  constructor(board) {

    //Parent constructor
    super(board)

    //Set type
    this.type = boardLayerTypes.MARKUP
  }

  /**
   * Remove all (erase layer and clear grid)
   */
  removeAll() {

    //Parent method
    super.removeAll()

    //Redraw grid layer to fill in erased gaps
    this.board
      .getLayer(boardLayerTypes.GRID)
      .redraw()
  }
}
