import GridObject from '../grid-object.js'
import {boardLayerTypes} from '../../constants/board.js'
import {swapColor} from '../../helpers/stone.js'

/**
 * This class is used for drawing markup on the board
 */
export default class Markup extends GridObject {

  //NOTE: All possible properties are declared here, even if they don't apply
  //to every child class. This is because of current implementation of public
  //class fields, which sees the child class overwrite any properties that are
  //set via setData() in the parent constructor.
  //SEE: https://stackoverflow.com/questions/64357900/javascript-why-does-declaring-a-property-in-a-subclass-overwrite-the-same-prope

  //Properties
  type
  color
  lineWidth
  lineCap
  lineDash
  scale
  font
  text
  alpha = 1

  //Variation markup
  index = 0
  showText
  isSelected

  /**
   * Constructor
   */
  constructor(board, data) {

    //Parent constructor
    super(board)

    //Set data
    this.setData(data)
  }

  /**
   * Get markup radius, with appropriate scaling applied
   */
  getRadius() {

    //Get data
    const {board, theme, type} = this
    const cellSize = board.getCellSize()
    const radius = theme.get('stone.radius', cellSize)
    const scale = this.scale || theme.get(`markup.${type}.scale`) || 1

    //No scaling factor
    if (scale === 1) {
      return radius
    }

    //Scale
    return Math.round(radius * scale)
  }

  /**
   * Get grid erase radius
   */
  getGridEraseRadius() {
    return this.getRadius()
  }

  /**
   * Get markup line width
   */
  getLineWidth() {
    const {board, theme, lineWidth} = this
    const cellSize = board.getCellSize()
    return lineWidth || theme.get('markup.lineWidth', cellSize) || 1
  }

  /**
   * Get markup line cap
   */
  getLineCap() {
    const {theme, type, lineCap} = this
    return lineCap || theme.get(`markup.${type}.lineCap`)
  }

  /**
   * Get markup line dash
   */
  getLineDash() {

    //Get data
    const {theme, type, lineDash: preset} = this
    const lineDash = preset || theme.get(`markup.${type}.lineDash`)

    //Must be an array
    if (Array.isArray(lineDash)) {
      return lineDash
    }

    //Comma separated
    return lineDash ? lineDash.split(',') : null
  }

  /**
   * Get font
   */
  getFont() {
    const {theme, font} = this
    return font || theme.get('markup.label.font')
  }

  /**
   * Get markup color
   */
  getColor(x, y) {
    const {theme, color} = this
    const stoneColor = this.getStoneColor(x, y)
    return color || theme.get('markup.color', stoneColor)
  }

  /**
   * Get stone color on given coordinates
   */
  getStoneColor(x, y) {

    //Get board
    const {board} = this

    //Check if there's a stone
    const stone = board.get(boardLayerTypes.STONES, x, y)
    if (stone) {
      if (board.getConfig('swapColors')) {
        return swapColor(stone.color)
      }
      return stone.color
    }

    //No stone
    return null
  }

  /**
   * Make a copy of this markup
   */
  getCopy() {

    //Get data and create copy
    const {board, type, alpha} = this
    const copy = new this.constructor(board)

    //Copy properties
    copy.type = type
    copy.alpha = alpha

    //Return copy
    return copy
  }

  /**
   * Draw
   */
  draw(context, x, y) {

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
