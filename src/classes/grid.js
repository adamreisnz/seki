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
    this.map = new Map()

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
    const key = this.getMapKey(x, y)
    this.map.set(key, value)
  }

  /**
   * Get a value
   */
  get(x, y) {
    if (!this.isOnGrid(x, y)) {
      return null
    }
    return this.getMapValue(x, y)
  }

  /**
   * Delete a value
   */
  delete(x, y) {
    if (!this.isOnGrid(x, y)) {
      return
    }
    const key = this.getMapKey(x, y)
    this.map.delete(key)
  }

  /**
   * Check if we have a non null value on the coordinates
   */
  has(x, y) {
    if (!this.isOnGrid(x, y)) {
      return false
    }
    const key = this.getMapKey(x, y)
    return this.map.has(key)
  }

  /**
   * Check if we have a specific value on the coordinates
   */
  is(x, y, check) {
    if (!this.isOnGrid(x, y)) {
      return false
    }
    const value = this.getMapValue(x, y)
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
    for (const [key, value] of this.map) {
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
    return (this.map.size === 0)
  }

  /**
   * Clear the grid
   */
  clear() {
    this.map.clear()
  }

  /**
   * Clone grid
   */
  clone() {

    //Get data
    const {width, height, map} = this

    //Create new instance and copy grid map
    const clone = new Grid(width, height)
    clone.map = new Map(map)

    //Return
    return clone
  }

  /**
   * Checks if a given grid is the same as the current grid
   */
  isSameAs(grid) {

    //Get data
    const {width, height, map} = this

    //Must have the same size
    if (width !== grid.width || height !== grid.height) {
      return false
    }

    //Must have the same amount of entries
    if (map.size !== grid.map.size) {
      return false
    }

    //Each entry should be the same
    for (const [key, value] of map) {
      if (grid.map.get(key) !== value) {
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
    const {width, height, map} = this

    //Must have the same size
    if (width !== newGrid.width || height !== newGrid.height) {
      throw new Error('Trying to compare grids of a different size')
    }

    //Initialize grid changes instance
    const changes = new GridChanges()

    //Go over each entry in the existing grid
    for (const [key, value] of map) {

      //Something to remove?
      if (!newGrid.map.has(key)) {
        const {x, y} = this.getCoords(key)
        changes.remove.push({x, y, value})
      }
    }

    //Go over each entry in the new grid
    for (const [key, value] of newGrid.map) {

      //Something to add?
      if (!map.has(key)) {
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

    //Set
    this.width = parseInt(width || 0)
    this.height = parseInt(height || width || 0)

    //Clear map
    this.map.clear()
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
  getMapKey(x, y) {
    return `${x},${y}`
  }

  /**
   * Get grid value for a given coordinate
   */
  getMapValue(x, y) {
    const key = this.getMapKey(x, y)
    return this.grid.get(key)
  }

  /**
   * Get coordinates based on map key
   */
  getCoords(mapKey) {
    const [x, y] = mapKey.split(',')
    return {x, y}
  }
}
