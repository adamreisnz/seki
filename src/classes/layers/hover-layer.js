import BoardLayer from '../board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'

//Valid types
const validTypes = [
  boardLayerTypes.STONES,
  boardLayerTypes.MARKUP,
]

/**
 * Hover layer
 */
export default class HoverLayer extends BoardLayer {

  /**
   * Constructor
   */
  constructor(board) {

    //Parent constructor
    super(board)

    //Set type
    this.type = boardLayerTypes.HOVER

    //Container for items to restore
    this.restore = new Set()
  }

  /**
   * Add hover object
   */
  add(x, y, object, type) {

    //Get data
    const {board, grid, restore} = this

    //Validate coordinates
    if (!grid.isOnGrid(x, y)) {
      return
    }

    //Validate type
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid hover item type: ${type}`)
    }

    //Check if we need to remove something from layers underneath
    if (board.has(type, x, y)) {
      const value = board.get(type, x, y)
      restore.add({x, y, type, value})
      board.remove(type, x, y)
    }

    //Add item now
    super.add(x, y, object)
  }

  /**
   * Remove hover object
   */
  remove(x, y) {

    //Get data
    const {board, grid, restore} = this

    //Check if we have anything on these coordinates
    if (!grid.has(x, y)) {
      return
    }

    //Remove it
    super.remove(x, y)

    //Any objects to restore?
    for (const entry of restore) {
      if (entry.x === x && entry.y === y) {
        const {type, value} = entry
        board.add(type, x, y, value)
        restore.delete(entry)
      }
    }
  }

  /**
   * Remove all hover objects
   */
  removeAll() {

    //Get data
    const {board, restore} = this

    //Remove all
    super.removeAll()

    //Any objects to restore?
    for (const entry of restore) {
      const {x, y, type, value} = entry
      board.add(type, x, y, value)
    }

    //Clear restoration set
    restore.clear()
  }
}
