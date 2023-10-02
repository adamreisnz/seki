
/**
 * Base class for objects that live on the board grid
 */
export default class GridObject {

  /**
   * Constructor
   */
  constructor(board) {
    this.board = board
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
  erase(context, gridX, gridY) {

    //Get data
    const {board, theme} = this

    //Get coordinates and stone radius
    const absX = board.getAbsX(gridX)
    const absY = board.getAbsY(gridY)
    const cellSize = board.getCellSize()
    const radius = theme.get('stone.radius', cellSize)

    //Clear rectangle the size of the stone radius
    context.clearRect(
      absX - radius,
      absY - radius,
      2 * radius,
      2 * radius,
    )
  }

  /**
   * Redraw
   */
  redraw(...args) {
    this.erase(...args)
    this.draw(...args)
  }
}
