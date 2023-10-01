import BoardLayer from './board-layer.js'

/**
 * Shadow layer
 */
export default class ShadowLayer extends BoardLayer {

  /**
   * Add a stone shadow object
   */
  add(stone) {

    //Get stone details
    const {shadow, alpha, color, x, y} = stone

    //Don't add if no shadow
    if (shadow === false || (typeof alpha !== 'undefined' && alpha < 1)) {
      return
    }

    //Get data
    const {grid} = this

    //Already have an object here?
    if (grid.has(x, y)) {
      return
    }

    //Add to grid
    grid.set(x, y, color)

    //Draw it
    stone.draw()
  }

  /**
   * Remove a stone
   */
  remove(stone) {

    //Get data
    const {x, y} = stone
    const {grid} = this

    //Remove from grid
    grid.unset(x, y)

    //Redraw whole layer
    this.redraw()
  }

  /**
   * Draw layer
   */
  draw() {

    //Check if can draw
    if (!this.canDraw()) {
      return
    }

    //Get data
    const {board, theme, context, grid} = this

    //Get shadowsize from theme
    const cellSize = board.getCellSize()
    const shadowSize = theme.get('shadow.size', cellSize)

    //Apply shadow transformation
    context.setTransform(1, 0, 0, 1, shadowSize, shadowSize)

    //Get all stones as objects
    const stones = grid.all('color')

    //Draw them
    for (const stone of stones) {
      stone.draw()
    }
  }
}
