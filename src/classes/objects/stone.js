import GridObject from '../grid-object.js'
import {stoneModifierTypes} from '../../constants/stone.js'
import {swapColor} from '../../helpers/stone.js'

/**
 * This class is used for drawing stones on the board
 */
export default class Stone extends GridObject {

  /**
   * Constructor
   */
  constructor(board, color, data) {

    //Parent constructor
    super(board)

    //Instantiate properties
    this.color = color
    this.scale = 1
    this.alpha = 1
    this.shadow = this.theme.get('stone.shadow')

    //Set properties from data
    this.setData(data)
  }

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

    //Swap if needed
    if (board.getConfig('swapColors')) {
      return swapColor(color)
    }
    return color
  }

  /**
   * Make a copy of this stone
   */
  getCopy() {

    //Get data and create copy
    const {board, scale, alpha, shadow} = this
    const copy = new this.constructor(board)

    //Copy properties
    copy.scale = scale
    copy.alpha = alpha
    copy.shadow = shadow

    //Return copy
    return copy
  }

  /**
   * Get modified copy of this stone (e.g. faded or mini)
   */
  getModifiedCopy(type) {

    //Get data and create copy
    const {board, theme, color} = this
    const copy = new this.constructor(board)

    //Validate type
    if (!Object.values(stoneModifierTypes).includes(type)) {
      throw new Error(`Invalid stone modifier type: ${type}`)
    }

    //Set color
    copy.color = color

    //Set themed properties
    copy.shadow = theme.get(`stone.${type}.shadow`)
    copy.scale = theme.get(`stone.${type}.scale`)
    copy.alpha = theme.get(`stone.${type}.alpha`, color)

    //Return copy
    return copy
  }
}
