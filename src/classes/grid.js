import {toObject} from '../helpers/grid.js'
import GridChanges from './grid-changes.js'

/**
 * This class represents a board grid of a given size. It acts as a
 * container for values (e.g. stone colors, markup types) for the layer classes,
 * as well as a container for stone color values for the game position class.
 * It has built in validation of coordinates.
 */
export default class Grid {

  /**
   * Constructor
   */
  constructor(width, height, emptyValue) {

    //Initialize size and grid array
    this.width = 0
    this.height = 0
    this.grid = []
    this.emptyValue = null

    //Set empty value if given
    if (typeof emptyValue !== 'undefined') {
      this.emptyValue = emptyValue
    }

    //Size given? Set it
    if (width || height) {
      this.setSize(width, height)
    }
  }

  /**
   * Set a value
   */
  set(x, y, value) {
    if (this.isOnGrid(x, y)) {
      this.grid[x][y] = value
    }
  }

  /**
   * Unset a value
   */
  unset(x, y) {
    if (this.isOnGrid(x, y)) {
      this.grid[x][y] = this.emptyValue
    }
  }

  /**
   * Check if we have a non null value on the coordinates
   */
  has(x, y) {
    return (this.isOnGrid(x, y) && this.grid[x][y] !== this.emptyValue)
  }

  /**
   * Check if we have a specific value on the coordinates
   */
  is(x, y, value) {
    return (this.isOnGrid(x, y) && this.grid[x][y] === value)
  }

  /**
   * Get a value, or an object with coordinates and the value in the given value key
   */
  get(x, y, valueKey) {

    //Validate
    if (!this.isOnGrid(x, y) || this.grid[x][y] === this.emptyValue) {
      return this.emptyValue
    }

    //Return as is?
    if (!valueKey) {
      return this.grid[x][y]
    }

    //Return as object
    return toObject(this.grid, x, y, valueKey)
  }

  /*****************************************************************************
   * Bulk operations
   ***/

  /**
   * Get all items in the grid. If you specify a value key, a list of objects
   * with coordinates and the value in the given value key will be returned.
   */
  getAll(valueKey) {

    //Just get the grid?
    if (!valueKey) {
      return this.grid
    }

    //Initialize objects list
    const objects = []

    //Loop coordinates
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.grid[x][y] !== this.emptyValue) {
          objects.push(toObject(this.grid, x, y, valueKey))
        }
      }
    }

    //Return objects list
    return objects
  }

  /**
   * Check if there is anything
   */
  isEmpty() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.grid[x][y] !== this.emptyValue) {
          return false
        }
      }
    }
    return true
  }

  /**
   * Populate the whole grid with a given value
   */
  populate(value) {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.grid[x][y] = value
      }
    }
  }

  /**
   * Empty the grid
   */
  empty() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.grid[x][y] = this.emptyValue
      }
    }
  }

  /**
   * Clone ourselves
   */
  clone() {

    //Create new instance
    const clone = new Grid()

    //Manually set vars for maximum efficiency
    clone.grid = structuredClone(this.grid)
    clone.emptyValue = this.emptyValue
    clone.width = this.width
    clone.height = this.height

    //Return
    return clone
  }

  /*****************************************************************************
   * Comparison
   ***/

  /**
   * Checks if a given grid is the same as the current grid
   */
  isSameAs(grid) {

    //Must have the same size
    if (this.width !== grid.width || this.height !== grid.height) {
      return false
    }

    //Loop all coordinates
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.grid[x][y] !== grid[x][y]) {
          return false
        }
      }
    }

    //No differences found
    return true
  }

  /**
   * Compares this position with another position and return change object
   */
  compare(newGrid, valueKey) {

    //Initialize board grid changes object
    const changes = new GridChanges()

    //Must have the same size
    if (this.width !== newGrid.width || this.height !== newGrid.height) {
      console.warn('Trying to compare grids of a different size')
      return changes
    }

    //Loop all coordinates
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {

        //Something to add?
        if (
          newGrid.grid[x][y] !== this.emptyValue &&
          newGrid.grid[x][y] !== this.grid[x][y]
        ) {
          changes.add.push(toObject(newGrid.grid, x, y, valueKey))
        }

        //Something to remove?
        if (
          this.grid[x][y] !== this.emptyValue &&
          newGrid.grid[x][y] !== this.grid[x][y]
        ) {
          changes.remove.push(toObject(this.grid, x, y, valueKey))
        }
      }
    }

    //Return changes grid
    return changes
  }

  /*****************************************************************************
   * Helpers
   ***/

  /**
   * Helper to validate coordinates (first param can be an object)
   */
  isOnGrid(x, y) {
    return (x >= 0 && y >= 0 && x < this.width && y < this.height)
  }

  /**
   * Helper to set the empty value
   */
  whenEmpty(emptyValue) {
    this.emptyValue = emptyValue
  }

  /**
   * Set the grid size
   */
  setSize(width, height) {

    //Check what's given
    width = width || height || 0
    height = height || width || 0

    //Set
    this.width = parseInt(width)
    this.height = parseInt(height)

    //Create grid array
    this.grid = []
    for (let x = 0; x < this.width; x++) {
      this.grid[x] = []
      for (let y = 0; y < this.height; y++) {
        this.grid[x][y] = this.emptyValue
      }
    }
  }

  /**
   * Get the grid size object
   */
  getSize() {
    return {width: this.width, height: this.height}
  }
}
