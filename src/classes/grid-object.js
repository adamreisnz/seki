
/**
 * Base class for objects that live on the board grid
 */
export default class GridObject {

  /**
   * Constructor
   */
  constructor(board, data) {

    //Set board
    this.board = board

    //Set properties from data
    this.setData(data)
  }

  /**
   * Set data
   */
  setData(data) {
    if (data && typeof data === 'object') {
      Object.assign(this, data)
    }
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
  draw(/*context, x, y*/) {}

  /**
   * Erase
   */
  erase(context, x, y) {

    //Get data
    const {board, theme} = this

    //Get coordinates and stone radius
    const absX = board.getAbsX(x)
    const absY = board.getAbsY(y)
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
