import Grid from './grid.js'

/**
 * This class represents a layer on the board and is the base class
 * for all board layers. Each layer can contain it's own objects on a grid with
 * coordinates and is responsible for drawing itself as well as its objects
 * onto the canvas.
 */
export default class BoardLayer {

  /**
   * Constructor
   */
  constructor(board) {

    //Init
    this.board = board
    this.grid = new Grid()
    this.context = undefined
  }

  /**
   * Set context
   */
  setContext(context) {
    this.context = context
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

  /*****************************************************************************
   * Generic grid and object handling
   ***/

  /**
   * Set grid size
   */
  setSize(width, height) {

    //NOTE: since this method is usually only called upon a global board resize,
    //which also triggers the redraw method for layers, the layer is not cleared
    //here, as it will happen anyway during the redraw cycle.

    //Set grid size (removes all objects in the process)
    this.grid.setSize(width, height)
  }

  /**
   * Get all items
   */
  getAll() {
    return this.grid.clone() //TODO need clone?
  }

  /**
   * Set all items at once
   */
  setAll(grid) {
    this.grid = grid.clone()
  }

  /**
   * Remove all (erase layer and clear grid)
   */
  removeAll() {
    this.erase()
    this.grid.clear()
  }

  /**
   * Add a single item
   */
  add(x, y, value) {
    this.eraseCell(x, y)
    this.grid.set(x, y, value)
    this.drawCell(x, y)
  }

  /**
   * Remove a single item
   */
  remove(x, y) {
    this.eraseCell(x, y)
    this.grid.delete(x, y)
  }

  /**
   * Get an item
   */
  get(x, y) {
    return this.grid.get(x, y)
  }

  /**
   * Check if there is an item
   */
  has(x, y) {
    return this.grid.has(x, y)
  }

  /*****************************************************************************
   * Drawing methods
   ***/

  /**
   * Draw
   */
  draw() {

    //Can't draw
    if (!this.canDraw()) {
      return
    }

    //Get all entries on the grid
    const entries = this.grid.getAll()
    const {context} = this

    //Draw them
    for (const entry of entries) {
      const {x, y, value: object} = entry
      object.draw(context, x, y)
    }
  }

  /**
   * Erase whole layer
   */
  erase() {

    //Check if can draw
    if (!this.canDraw()) {
      return
    }

    //Get context
    const {context} = this

    //Clear rectangle
    context.clearRect(
      0,
      0,
      context.canvas.clientWidth,
      context.canvas.clientHeight,
    )
  }

  /**
   * Redraw
   */
  redraw() {
    this.erase()
    this.draw()
  }

  /**
   * Draw cell
   */
  drawCell(x, y) {

    //Get object
    const object = this.grid.get(x, y)
    const {context} = this

    //Draw it
    if (object) {
      object.draw(context, x, y)
    }
  }

  /**
   * Erase cell
   */
  eraseCell(x, y) {

    //Get object
    const object = this.grid.get(x, y)
    const {context} = this

    //Erase it
    if (object) {
      object.erase(context, x, y)
    }
  }

  /**
   * Redraw cell
   */
  redrawCell(...args) {
    this.eraseCell(...args)
    this.drawCell(...args)
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
