
/**
 * Base class for board objects
 */
export default class BoardObject {

  /**
   * Constructor
   */
  constructor(board, theme) {
    this.setBoard(board)
    this.setTheme(theme)
  }

  /**************************************************************************
   * Drawing helpers
   ***/

  /**
   * Draw
   */
  draw(/*context*/) {}

  /**
   * Clear
   */
  clear(/*context*/) {}

  /**
   * Redraw
   */
  redraw(context) {
    this.clear(context)
    this.draw(context)
  }

  /**
   * Check if can draw
   */
  canDraw(context) {

    //Get board and context
    const {board} = this

    //Can only draw when we have dimensions and context
    if (!context || board.drawWidth === 0 || board.drawheight === 0) {
      return false
    }

    //Ok to draw
    return true
  }
}
