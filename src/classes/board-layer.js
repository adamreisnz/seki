import Grid from './grid.js'
import {createCanvasContext} from '../helpers/canvas.js'

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
  constructor(board, theme) {

    //Set board and t heme
    this.setBoard(board)
    this.setTheme(theme)

    //Create grid
    this.createGrid()
  }

  /**
   * Set the board
   */
  setBoard(board) {
    this.board = board
  }

  /**
   * Set the theme
   */
  setTheme(theme) {
    this.theme = theme
  }

  /**
   * Create grid
   */
  createGrid() {
    this.grid = new Grid()
  }

  /**
   * Create canvas context for this layer
   */
  createContext(element) {

    //Get type
    const {type} = this
    const context = createCanvasContext(element, type)

    //Set context
    this.setContext(context)
  }

  /*****************************************************************************
   * Generic grid and object handling
   ***/

  /**
   * Set grid size
   */
  setSize(width, height) {

    //Note: since this method is usually only called upon a global board resize,
    //which also triggers the redraw method for layers, the layer is not cleared
    //here, as it will happen anyway during the redraw cycle.

    //Set it in the grid (removing all objects in the process)
    this.grid.setSize(width, height)
  }

  /**
   * Get all items
   */
  getAll() {
    return this.grid.clone()
  }

  /**
   * Set all items at once
   */
  setAll(grid) {
    this.grid = grid.clone()
  }

  /**
   * Remove all (clear layer and empty grid)
   */
  removeAll() {
    this.clear()
    this.grid.empty()
  }

  /**
   * Add a single item
   */
  add(x, y, value) {
    this.clearCell(x, y)
    this.grid.set(x, y, value)
    this.drawCell(x, y)
  }

  /**
   * Remove a single item
   */
  remove(x, y) {
    this.clearCell(x, y)
    this.grid.unset(x, y)
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

    //Check if can draw
    if (!this.canDraw()) {
      return
    }
  }

  /**
   * Clear layer (this method doesn't clear objects, as the canvas wipe clears the entire canvas)
   */
  clear() {

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
    this.clear()
    this.draw()
  }

  /**
   * Draw cell
   */
  drawCell(/*x, y*/) {
    //Drawing method to be implemented in specific layer class
  }

  /**
   * Clear cell
   */
  clearCell(/*x, y*/) {
    //Clearing method to be implemented in specific layer class
  }

  /**
   * Redraw cell
   */
  redrawCell(x, y) {
    this.clearCell(x, y)
    this.drawCell(x, y)
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
