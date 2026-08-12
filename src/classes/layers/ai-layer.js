import BoardLayer from './board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'

/**
 * AI layer
 *
 * Holds the markers an engine's analysis puts on the board, being the
 * candidate moves it suggests for the current position.
 *
 * These are kept off the markup layer because they do not draw the way markup
 * does. A candidate marker carries a drop shadow that reaches outside the cell
 * it sits on, which a cell sized erase leaves a crescent of behind, so this
 * layer is erased as a whole instead. Markup itself is flat and comes off a
 * cell at a time perfectly cleanly, and there is no reason to make every piece
 * of it pay for the way these draw.
 *
 * It is also only ever set or cleared in full, one set of candidates per
 * position, so erasing as a whole costs nothing here.
 */
export default class AiLayer extends BoardLayer {

  //Type
  type = boardLayerTypes.AI

  /**
   * Set all markers at once
   */
  setAll(grid) {

    //Take down what's there first, so the grid lines underneath it come back
    this.removeAll()

    //Parent method
    super.setAll(grid)
  }

  /**
   * Remove all (erase layer and clear grid)
   */
  removeAll() {

    //Erase each marker in turn first. That is what puts back the grid line
    //each of them erased underneath itself, which clearing the canvas as a
    //whole knows nothing about.
    for (const {x, y} of this.grid.getAll()) {
      this.eraseCell(x, y)
    }

    //Parent method, which clears the canvas as a whole and with it whatever
    //the erases above left outside their own cells
    super.removeAll()
  }

  /**
   * Remove a single marker
   */
  remove(x, y) {

    //Erase the cell, which puts back the grid line underneath it
    this.eraseCell(x, y)
    this.grid.delete(x, y)

    //Then redraw the layer as a whole, as the marker's shadow reached outside
    //the cell that was just erased
    this.redraw()
  }
}
