import BoardLayer from '../board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'

/**
 * Stones layer
 */
export default class StonesLayer extends BoardLayer {

  /**
   * Constructor
   */
  constructor(board) {

    //Call parent constructor
    super(board)

    //Set type
    this.type = boardLayerTypes.STONES
  }

  /**
   * Set all stones at once
   */
  // setAll(grid) {

  //   //TODO: Why is this going over changes one by one as opposed to just cloning the grid?

  //   //Get changes compared to current grid
  //   const changes = this.grid.compare(grid)

  //   //Clear removed stones
  //   for (const entry of changes.remove) {
  //     const {x, y} = entry
  //     this.remove(x, y)
  //   }

  //   //Draw added stones
  //   for (const entry of changes.add) {
  //     const {x, y, value: stone} = entry
  //     this.add(x, y, stone)
  //   }

  //   //Redraw layer
  //   //TODO: why redraw needed right after setAll()
  //   this.redraw()
  // }

  /**
   * Add a single stone
   */
  add(x, y, stone) {

    //Add to stones layer
    super.add(x, y, stone)

    //Also add to shadows layer
    this.board.add(boardLayerTypes.SHADOW, x, y, stone)
  }

  /**
   * Remove a single stone
   */
  remove(x, y) {

    //Remove from stones layer
    super.remove(x, y)

    //Also remove from shadows layer
    this.board.remove(boardLayerTypes.SHADOW, x, y)
  }
}
