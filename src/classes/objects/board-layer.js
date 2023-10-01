import Grid from '../grid.js'
import BoardObject from './board-object.js'

/**
 * This class represents a layer on the board and is the base class
 * for all board layers. Each layer can contain it's own objects on a grid with
 * coordinates and is responsible for drawing itself as well as its objects
 * onto the canvas.
 */
export default class BoardLayer extends BoardObject {

  /**
   * Constructor
   */
  constructor(board, theme, context) {

    //Parent constructor
    super(board, theme, context)

    //Initialize grid for board objects
    this.grid = new Grid()
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
   * Clear layer (this method doesn't clear objects, as the canvas wipe clears the entire canvas)
   */
  clear() {
    if (this.context) {
      this.context.clearRect(
        0, 0, this.context.canvas.clientWidth, this.context.canvas.clientHeight,
      )
    }
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
}
