
/**
 * Base class for objects that live on the board grid
 */
export default class GridObject {

  /**
   * Constructor
   */
  constructor(board, layer) {
    this.board = board
    this.layer = layer
  }

  /**
   * Virtual accessor for theme
   */
  get theme() {
    if (!this.board) {
      return null
    }
    return this.board.theme
  }

  /**
   * Draw
   */
  draw(/*context, gridX, gridY*/) {}

  /**
   * Erase
   */
  erase(/*context, gridX, gridY*/) {}

  /**
   * Redraw
   */
  redraw(...args) {
    this.erase(...args)
    this.draw(...args)
  }
}
