import GridChanges from './grid-changes.js'

/**
 * This class represents a board grid of a given size. It acts as a
 * container for values (e.g. stone colors, markup types) for board layers,
 * as well as a container for stone color values for the game position class.
 */
export default class Grid {

  /**
   * Constructor
   */
  constructor(width, height) {

    //Initialize size and underlying grid map
    this.width = 0
    this.height = 0
    this.grid = new Map()

    //Size given? Set it
    if (width || height) {
      this.setSize(width, height)
    }
  }

  /**
   * Set a value
   */
  set(x, y, value) {
    if (!this.isOnGrid(x, y)) {
      return
    }
    const key = this.getGridMapKey(x, y)
    this.grid.set(key, value)
  }

  /**
   * Get a value
   */
  get(x, y) {
    if (!this.isOnGrid(x, y)) {
      return null
    }
    return this.getGridMapValue(x, y)
  }

  /**
   * Delete a value
   */
  delete(x, y) {
    if (!this.isOnGrid(x, y)) {
      return
    }
    const key = this.getGridMapKey(x, y)
    this.grid.delete(key)
  }

  /**
   * Check if we have a non null value on the coordinates
   */
  has(x, y) {
    if (!this.isOnGrid(x, y)) {
      return false
    }
    const key = this.getGridMapKey(x, y)
    return this.grid.has(key)
  }

  /**
   * Check if we have a specific value on the coordinates
   */
  is(x, y, check) {

    //Nothing on grid on these coordinates
    if (!this.isOnGrid(x, y)) {
      return false
    }

    //Get value
    const value = this.getGridMapValue(x, y)

    //Object, check keys (1 level deep)
    if (value && typeof value === 'object') {

      //Check is not an object
      if (!check || typeof check !== 'object') {
        return false
      }

      //Compare
      return Object
        .keys(check)
        .every(key => value[key] === check[key])
    }

    //Simple check
    return (value === check)
  }

  /*****************************************************************************
   * Bulk operations
   ***/

  /**
   * Get all items in the grid. If you specify a value key, a list of objects
   * with coordinates and the value in the given value key will be returned.
   */
  getAll() {

    //Initialize objects
    const objects = []

    //Loop map
    for (const [key, value] of this.grid) {
      const {x, y} = this.getCoords(key)
      objects.push({x, y, value})
    }

    //Return objects list
    return objects
  }

  /**
   * Check if there is anything
   */
  isEmpty() {
    return (this.grid.size === 0)
  }

  /**
   * Clear the grid
   */
  clear() {
    this.grid.clear()
  }

  /**
   * Clone grid
   */
  clone() {

    //Create new instance
    const {width, height, grid} = this
    const clone = new Grid(width, height)

    //Copy grid
    clone.grid = new Map(grid)

    //Return
    return clone
  }

  /**
   * Transform grid into another grid applying a transformation function
   * on each entry. This is used to transform simple game position grids
   * into grids with Stone or Markup instances
   */
  map(fn) {

    //Create new instance
    const {width, height, grid} = this
    const clone = new Grid(width, height)

    //Process each entry
    for (const [key, value] of grid) {
      clone.grid.set(key, fn(value))
    }

    //Return cloned grid
    return clone
  }

  /**
   * Create a new grid, filtering out entries
   */
  filter(fn) {

    //Create new instance
    const {width, height, grid} = this
    const clone = new Grid(width, height)

    //Process each entry
    for (const [key, value] of grid) {
      if (fn(value)) {
        clone.grid.set(key, value)
      }
    }

    //Return clone
    return clone
  }

  /**
   * Iterate each item in the grid
   */
  forEach(fn) {

    //Get grid
    const {grid} = this

    //Process each entry
    for (const [key, value] of grid) {
      const {x, y} = this.getCoords(key)
      fn(value, x, y)
    }
  }

  /**
   * Checks if a given grid is the same as the current grid
   */
  isSameAs(other) {

    //Get data
    const {width, height, grid} = this

    //Must have the same size
    if (width !== other.width || height !== other.height) {
      return false
    }

    //Must have the same amount of entries
    if (grid.size !== other.grid.size) {
      return false
    }

    //Each entry should be the same
    for (const [key, value] of grid) {
      if (other.grid.get(key) !== value) {
        return false
      }
    }

    //No differences found
    return true
  }

  /**
   * Compares this position with another position and return change object
   */
  compare(newGrid) {

    //Get data
    const {width, height, grid} = this

    //Must have the same size
    if (width !== newGrid.width || height !== newGrid.height) {
      throw new Error('Trying to compare grids of a different size')
    }

    //Initialize grid changes instance
    const changes = new GridChanges()

    //Go over each entry in the existing grid
    for (const [key, value] of grid) {

      //Something to remove?
      if (!newGrid.grid.has(key)) {
        const {x, y} = this.getCoords(key)
        changes.remove.push({x, y, value})
      }
    }

    //Go over each entry in the new grid
    for (const [key, value] of newGrid.grid) {

      //Something to add?
      if (!grid.has(key)) {
        const {x, y} = this.getCoords(key)
        changes.add.push({x, y, value})
      }
    }

    //Return changes
    return changes
  }

  /*****************************************************************************
   * Helpers
   ***/

  /**
   * Helper to validate coordinates (first param can be an object)
   */
  isOnGrid(x, y) {
    const {width, height} = this
    return (x >= 0 && y >= 0 && x < width && y < height)
  }

  /**
   * Set the grid size
   */
  setSize(width, height) {

    //Only if anything changed
    if (this.width === width && this.height === height) {
      return
    }

    //Set
    this.width = width || 0
    this.height = height || width || 0

    //Clear grid
    this.grid.clear()
  }

  /**
   * Get the grid size object
   */
  getSize() {
    const {width, height} = this
    return {width, height}
  }

  /**
   * Get grid key for a given coordinate
   */
  getGridMapKey(x, y) {
    return `${x},${y}`
  }

  /**
   * Get grid value for a given coordinate
   */
  getGridMapValue(x, y) {
    const key = this.getGridMapKey(x, y)
    return this.grid.get(key)
  }

  /**
   * Get coordinates based on map key
   */
  getCoords(mapKey) {
    const [x, y] = mapKey.split(',')
    return {x: parseInt(x), y: parseInt(y)}
  }
}
