import {setSubtract} from '../helpers/grid.js'

/**
 * This class is a simple class which acts as a wrapper for
 * changes between two board grids. It simply keeps track of what was added
 * and what was removed.
 */
export default class GridChanges {

  /**
   * Constructor
   */
  constructor() {

    //Containers
    this.add = []
    this.remove = []
  }

  /**
   * Concatenation helper
   */
  concat(newChanges) {
    this.add = setSubtract(this.add, newChanges.remove)
      .concat(newChanges.add)
    this.remove = setSubtract(this.remove, newChanges.add)
      .concat(newChanges.remove)
  }

  /**
   * Check if there are changes
   */
  has() {
    return !!(this.add.length || this.remove.length)
  }
}
