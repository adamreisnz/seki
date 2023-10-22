import Grid from '../grid.js'
import {getPixelRatio} from '../../helpers/util.js'

/**
 * This class represents a layer on the board and is the base class
 * for all board layers. Each layer can contain it's own objects on a grid with
 * coordinates and is responsible for drawing itself as well as its objects
 * onto the canvas.
 */
export default class BoardLayer {

  //Context
  context

  /**
   * Constructor
   */
  constructor(board) {

    //Init
    this.board = board
    this.grid = new Grid()
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
  setGridSize(width, height) {

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
    return this.grid
  }

  /**
   * Set all items at once
   */
  setAll(grid) {
    this.grid = grid
    this.redraw()
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
      if (Array.isArray(object)) {
        object.forEach(obj => obj.draw(context, x, y))
      }
      else {
        object.draw(context, x, y)
      }
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
    const pixelRatio = getPixelRatio()

    //Clear rectangle
    context.clearRect(
      0,
      0,
      context.canvas.clientWidth * pixelRatio,
      context.canvas.clientHeight * pixelRatio,
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
    const {board, context} = this

    //No object
    if (!object) {
      return
    }

    //Not on board
    if (!board.isOnBoard(x, y)) {
      return
    }

    //Draw it
    if (Array.isArray(object)) {
      object.forEach(obj => obj.draw(context, x, y))
    }
    else if (object) {
      object.draw(context, x, y)
    }
  }

  /**
   * Erase cell
   */
  eraseCell(x, y) {

    //Get object
    const object = this.grid.get(x, y)
    const {board, context} = this

    //No object
    if (!object) {
      return
    }

    //Not on board
    if (!board.isOnBoard(x, y)) {
      return
    }

    //Draw it
    if (Array.isArray(object)) {
      object.forEach(obj => obj.erase(context, x, y))
    }
    else if (object) {
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

  /**
   * Helper to prepare a context for drawing
   */
  prepareContext(canvasTranslate) {

    //Get data
    const {context} = this

    //Translate canvas
    context.translate(canvasTranslate, canvasTranslate)
  }

  /**
   * Helper to restore context state after drawing
   */
  restoreContext(canvasTranslate) {

    //Get data
    const {context} = this

    //Undo translation
    context.translate(-canvasTranslate, -canvasTranslate)
  }
}
