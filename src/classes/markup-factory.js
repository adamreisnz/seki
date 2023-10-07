import MarkupCircle from './objects/markup-circle.js'
import MarkupSquare from './objects/markup-square.js'
import MarkupTriangle from './objects/markup-triangle.js'
import MarkupDiamond from './objects/markup-diamond.js'
import MarkupMark from './objects/markup-mark.js'
import MarkupLabel from './objects/markup-label.js'
import MarkupHappy from './objects/markup-happy.js'
import MarkupSad from './objects/markup-sad.js'
import MarkupSelect from './objects/markup-select.js'
import MarkupVariation from './objects/markup-variation.js'
import MarkupLastMove from './objects/markup-last-move.js'
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
      case markupTypes.HAPPY:
        return MarkupHappy
      case markupTypes.SAD:
        return MarkupSad
      case markupTypes.LABEL:
        return MarkupLabel
      case markupTypes.SELECT:
        return MarkupSelect
      case markupTypes.VARIATION:
        return MarkupVariation
      case markupTypes.LAST_MOVE:
        return MarkupLastMove
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
}
