import MarkupLabel from './markup-label.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Move number markup (on stone)
 */
export default class MarkupMoveNumber extends MarkupLabel {

  //Type
  type = markupTypes.MOVE_NUMBER

  //Move number
  number = 0

  //Additional properties
  fontSize
  text

  /**
   * Constructor
   */
  constructor(board, data) {
    super(board)
    if (data && data.number) {
      this.number = data.number
    }
  }

  /**
   * Load additional properties for this markup type
   */
  loadProperties(x, y) {

    //Load parent properties
    const args = super.loadProperties(x, y)
    const {number} = this

    //Load additional properties
    this.loadThemeProp('fontSize', ...args, number)
    this.loadThemeProp('text', number)

    //Pass on args
    return args
  }
}
