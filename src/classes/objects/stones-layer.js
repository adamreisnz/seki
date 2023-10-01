import BoardLayer from './board-layer.js'
import {stoneColors} from '../../constants/index.js'

/**
 * Stones layer
 */
export default class StonesLayer extends BoardLayer {

  /**
   * Constructor
   */
  constructor(board, theme, context) {

    //Call parent constructor
    super(board, theme, context)

    //Set empty value for grid
    this.grid.whenEmpty(stoneColors.EMPTY)
  }

  /**
   * Set all stones at once
   */
  setAll(grid) {

    //Get changes compared to current grid
    const {remove, add} = this.grid.compare(grid, 'color')

    //Clear removed stones
    for (const stone of remove) {
      stone.clear()
    }

    //Draw added stones
    for (const stone of add) {
      stone.draw()
    }

    //Set new grid
    this.grid = grid.clone()
  }

  /*****************************************************************************
   * Drawing
   ***/

  /**
   * Draw layer
   */
  draw() {

    //Can't draw
    if (!this.canDraw()) {
      return
    }

    //Get all stones on the grid
    const stones = this.grid.getAll('color')

    //Draw them
    for (const stone of stones) {
      stone.draw()
    }
  }

  /**
   * Redraw layer
   */
  redraw() {

    //Clear shadows layer
    this.board.removeAll('shadow')

    //Redraw ourselves
    this.clear()
    this.draw()
  }

  /**
   * Draw cell
   */
  drawCell(x, y) {

    //Get grid
    const {grid} = this

    //Draw if on grid
    if (grid.has(x, y)) {
      const stone = grid.get(x, y, 'color')
      stone.draw()
    }
  }

  /**
   * Clear cell
   */
  clearCell(x, y) {

    //Get grid
    const {grid} = this

    //Clear if on grid
    if (grid.has(x, y)) {
      const stone = grid.get(x, y, 'color')
      stone.clear()
    }
  }
}
