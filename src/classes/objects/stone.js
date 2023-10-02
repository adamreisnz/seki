import GridObject from '../grid-object.js'

/**
 * This class is used for drawing stones on the board
 */
export default class Stone extends GridObject {

  /**
   * Constructor
   */
  constructor(board, layer) {

    //Parent constructor
    super(board, layer)

    //Instantiate properties
    this.scale = 1
    this.alpha = 1
    this.shadow = this.theme.get('stone.shadow')
  }

  /**
   * Draw stone shadow
   */
  drawShadow() {

    //Get data
    const {board, shadow} = this

    //Add shadow
    if (shadow) {
      board.layers.shadow.add(this)
    }
  }

  /**
   * Clear stone shadow
   */
  clearShadow() {

    //Get data
    const {board, shadow} = this

    //Remove shadow
    if (shadow) {
      board.layers.shadow.remove(this)
    }
  }

  /**************************************************************************
   * Helpers
   ***/

  /**
   * Get stone radius, with scaling applied
   */
  getRadius() {

    //Get data
    const {board, theme, scale} = this
    const cellSize = board.getCellSize()
    const radius = theme.get('stone.radius', cellSize)

    //No scaling factor
    if (scale === 1) {
      return radius
    }

    //Scale
    return Math.round(radius * scale)
  }

  /**
   * Get stone color, with multiplier applied
   */
  getColor() {

    //Get data
    const {board, color} = this

    //Apply color multiplier
    return color * board.colorMultiplier
  }
}
