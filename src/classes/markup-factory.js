import MarkupCircle from './objects/markup-circle.js'
import MarkupSquare from './objects/markup-square.js'
import MarkupTriangle from './objects/markup-triangle.js'
import MarkupDiamond from './objects/markup-diamond.js'
import MarkupMark from './objects/markup-mark.js'
import MarkupSelect from './objects/markup-select.js'
import MarkupLabel from './objects/markup-label.js'
import MarkupHappy from './objects/markup-happy.js'
import MarkupSad from './objects/markup-sad.js'
import {markupTypes} from '../constants/markup.js'

/**
 * Markup factory class
 */
export default class MarkupFactory {

  /**
   * Get markup class to use
   */
  static getClass(type) {
    switch (type) {
      case markupTypes.CIRCLE:
        return MarkupCircle
      case markupTypes.SQUARE:
        return MarkupSquare
      case markupTypes.TRIANGLE:
        return MarkupTriangle
      case markupTypes.DIAMOND:
        return MarkupDiamond
      case markupTypes.MARK:
        return MarkupMark
      case markupTypes.SELECT:
        return MarkupSelect
      case markupTypes.LABEL:
        return MarkupLabel
      case markupTypes.HAPPY:
        return MarkupHappy
      case markupTypes.SAD:
        return MarkupSad
      default:
        throw new Error(`Unknown markup type type: ${type}`)
    }
  }

  /**
   * Create markup
   */
  static create(type, board, data, ...args) {
    const MarkupClass = this.getClass(type)
    return new MarkupClass(board, data, ...args)
  }

  /**
   * Create for indicator
   */
  static createForIndicator(indicatorType, board, stoneColor, t) {

    //Get theme data
    const type = board.theme.get(`markup.${indicatorType}.type`)
    const text = board.theme.get(`markup.${indicatorType}.text`, t)
    const color = board.theme.get(`markup.${indicatorType}.color`, stoneColor)
    const scale = board.theme.get(`markup.${indicatorType}.scale`)
    const alpha = board.theme.get(`markup.${indicatorType}.alpha`)
    const lineDash = board.theme.get(`markup.${indicatorType}.lineDash`)

    //No type
    if (!type) {
      return
    }

    //Create
    return this.create(type, board, {
      text, color, scale, alpha, lineDash, indicatorType,
    })
  }
}
