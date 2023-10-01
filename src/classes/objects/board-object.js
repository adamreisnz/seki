
/**
 * Base class for board objects
 */
export default class BoardObject {

  /**
   * Constructor
   */
  constructor(board, theme, context) {
    this.setBoard(board)
    this.setTheme(theme)
    this.setContext(context)
  }

  /**
   * Set the board
   */
  setBoard(board) {
    this.board = board
  }

  /**
   * Get the board
   */
  getBoard() {
    return this.board
  }

  /**
   * Set the theme
   */
  setTheme(theme) {
    this.theme = theme
  }

  /**
   * Get the theme
   */
  getTheme() {
    return this.theme
  }

  /**
   * Set the canvas2d context
   */
  setContext(context) {
    this.context = context
  }

  /**
   * Get the canvas2d context
   */
  getContext() {
    return this.context
  }

  /**************************************************************************
   * Drawing helpers
   ***/

  /**
   * Draw
   */
  draw() {}

  /**
   * Clear
   */
  clear() {}

  /**
   * Redraw
   */
  redraw() {
    this.clear()
    this.draw()
  }

  /**
   * Check if we can draw
   */
  canDraw() {

    //Get board and context
    const {board, context} = this

    //Can only draw when we have dimensions and context
    if (!context || board.drawWidth === 0 || board.drawheight === 0) {
      return false
    }

    //Ok to draw
    return true
  }
}
