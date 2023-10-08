
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
   * Get absolute coordinates for a grid position
   */
  getAbsX(x) {
    return this.board.getAbsX(x)
  }
  getAbsY(y) {
    return this.board.getAbsY(y)
  }

  /**
   * Load a single theme prop
   */
  loadThemeProp(prop, ...args) {
    const value = this.getThemeProp(prop, ...args)
    if (typeof value !== 'undefined') {
      this[prop] = value
    }
  }

  /**
   * Get single theme property
   */
  getThemeProp(prop, ...args) {
    const {theme} = this
    const paths = this.getThemePaths(prop)
    for (const path of paths) {
      if (theme.has(path)) {
        return theme.get(path, ...args)
      }
    }
  }

  /**
   * Get theme paths to check
   */
  getThemePaths(prop) {
    return [prop]
  }

  /**
   * Get object radius, with scaling applied
   */
  getRadius(color, cellSize) {
    const {scale} = this
    const radius = this.getThemeProp('radius', color, cellSize)
    return Math.round(radius * (scale || 1))
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

  /**
   * Helper to prepare a context for drawing
   */
  prepareContext(context) {

    //Get data
    const {theme, alpha} = this
    const canvasTranslate = theme.canvasTranslate()

    //Translate canvas
    context.translate(canvasTranslate, canvasTranslate)

    //Apply transparency?
    if (alpha && alpha < 1) {
      context.globalAlpha = alpha
    }
  }

  /**
   * Helper to restore context state after drawing
   */
  restoreContext(context) {

    //Get data
    const {theme, alpha} = this
    const canvasTranslate = theme.canvasTranslate()

    //Reset transparency
    if (alpha && alpha < 1) {
      context.globalAlpha = 1
    }

    //Undo translation
    context.translate(-canvasTranslate, -canvasTranslate)
  }
}
