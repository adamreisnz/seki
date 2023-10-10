import GridObject from './grid-object.js'
import {boardLayerTypes} from '../../constants/board.js'

/**
 * This class is used for drawing markup on the board
 */
export default class Markup extends GridObject {

  //Type
  type = null

  //Theme prop default values
  color
  scale = 1
  alpha = 1
  lineWidth = 1

  //Props that can be set by theme
  themeProps = [
    'color',
    'scale',
    'alpha',
    'lineWidth',
  ]

  /**
   * Get theme paths to check
   */
  getThemePaths(prop) {
    const {type} = this
    return [
      `markup.${type}.${prop}`,
      `markup.base.${prop}`,
    ]
  }

  /**
   * Load properties
   */
  loadProperties(x, y) {

    //Get data
    const {board} = this

    //Obtain cell size and stone color (which could be swapped)
    const cellSize = board.getCellSize()
    const stoneColor = this.getStoneColor(x, y)

    //Load basic theme props
    for (const prop of this.themeProps) {
      this.loadThemeProp(prop, cellSize, stoneColor)
    }

    //Now load radius and remember stone color
    this.radius = this.getRadius(cellSize, stoneColor)
    this.stoneColor = stoneColor

    //Return cellsize and stone color for child handlers
    return [cellSize, stoneColor]
  }

  /**
   * Get grid erase radius
   */
  getGridEraseRadius() {
    return this.radius
  }

  /**
   * Get stone color on given coordinates
   */
  getStoneColor(x, y) {

    //Get data
    const {board, displayColor} = this

    //Fixed display color?
    if (displayColor) {
      return board.getDisplayColor(displayColor)
    }

    //Get stone on position
    const stone = board.get(boardLayerTypes.STONES, x, y)
    if (stone) {
      return board.getDisplayColor(stone.stoneColor)
    }

    //No color
    return null
  }

  /**
   * Draw
   */
  draw(context, x, y) {

    //Load properties
    this.loadProperties(x, y)

    //Check if we clear the grid below us
    const {board} = this
    const radius = this.getGridEraseRadius()

    //No stone, no need
    if (!board.has(boardLayerTypes.STONES, x, y)) {
      board
        .getLayer(boardLayerTypes.GRID)
        .eraseCell(x, y, radius)
    }

    //Actual drawing is left as an excercise for the child class
  }

  /**
   * Erase
   */
  erase(context, x, y) {

    //Erase the markup
    super.erase(context, x, y)

    //Redraw grid cell
    const {board} = this
    if (!board.has(boardLayerTypes.STONES, x, y)) {
      board
        .getLayer(boardLayerTypes.GRID)
        .redrawCell(x, y)
    }
  }
}
