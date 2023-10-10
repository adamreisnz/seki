import BoardLayer from './board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'
import Stone from '../objects/stone.js'
import Markup from '../objects/markup.js'

//Layer type to object mapping
const typeToObject = {
  [boardLayerTypes.STONES]: Stone,
  [boardLayerTypes.MARKUP]: Markup,
}

/**
 * Hover layer
 */
export default class HoverLayer extends BoardLayer {

  //Type
  type = boardLayerTypes.HOVER

  /**
   * Constructor
   */
  constructor(board) {

    //Parent constructor
    super(board)

    //Container for items to restore
    this.restore = new Set()
  }

  /**
   * Add hover object
   */
  add(x, y, object) {

    //Get data
    const {board, grid, restore} = this

    //Validate coordinates
    if (!grid.isOnGrid(x, y)) {
      return
    }

    //Determine type
    const check = Array.isArray(object) ? object[0] : object
    const type = Object
      .keys(typeToObject)
      .find(type => check instanceof typeToObject[type])

    //Validate
    if (!type) {
      throw new Error(`Invalid hover object`)
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
