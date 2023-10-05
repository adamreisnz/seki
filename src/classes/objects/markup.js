import GridObject from '../grid-object.js'
import {boardLayerTypes} from '../../constants/board.js'
import {swapColor} from '../../helpers/stone.js'

/**
 * This class is used for drawing markup on the board
 */
export default class Markup extends GridObject {

  /**
   * Constructor
   */
  constructor(board) {

    //Parent constructor
    super(board)

    //Instantiate properties
    this.type = undefined
    this.color = undefined
    this.lineWidth = undefined
    this.lineCap = undefined
    this.alpha = 1
  }

  /**
   * Get markup radius, with appropriate scaling applied
   */
  getRadius() {

    //Get data
    const {board, theme, type} = this
    const cellSize = board.getCellSize()
    const radius = theme.get('stone.radius', cellSize)
    const scale = theme.get(`markup.${type}.scale`)

    //No scaling factor
    if (scale === 1) {
      return radius
    }

    //Scale
    return Math.round(radius * scale)
  }

  /**
   * Get markup line width
   */
  getLineWidth() {

    //Get data
    const {board, theme, lineWidth} = this

    //Preset line width
    if (lineWidth) {
      return lineWidth
    }

    //Dynamic line width based on theme
    const cellSize = board.getCellSize()
    return theme.get('markup.lineWidth', cellSize) || 1
  }

  /**
   * Get markup line cap
   */
  getLineCap() {

    //Get data
    const {theme, lineCap} = this

    //Preset line width
    if (lineCap) {
      return lineCap
    }

    //Dynamic line cap based on theme
    return theme.get('markup.lineCap')
  }

  /**
   * Get markup color
   */
  getColor(x, y) {

    //Get data
    const {theme, color} = this

    //Preset color
    if (color) {
      return color
    }

    //Dynamic color based on stone color
    const stoneColor = this.getStoneColor(x, y)
    return theme.get('markup.color', stoneColor)
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
      if (board.swapColors) {
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
}
