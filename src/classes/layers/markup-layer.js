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
}
