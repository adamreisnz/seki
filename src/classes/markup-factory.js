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
import MarkupCandidate from './objects/markup-candidate.js'
import MarkupSequence from './objects/markup-sequence.js'
import MarkupLastMove from './objects/markup-last-move.js'
import MarkupMoveNumber from './objects/markup-move-number.js'
import {markupTypes} from '../constants/markup.js'

/**
 * The class that draws each markup type
 *
 * NOTE: markupTypes carries types that have no class here, being the arrow
 * and the line, which are recognised but not implemented. This map is what
 * says so, so that a caller choosing a type can ask rather than find out by
 * being thrown at.
 */
const markupClasses = {

  //Drawable
  [markupTypes.CIRCLE]: MarkupCircle,
  [markupTypes.SQUARE]: MarkupSquare,
  [markupTypes.TRIANGLE]: MarkupTriangle,
  [markupTypes.DIAMOND]: MarkupDiamond,
  [markupTypes.MARK]: MarkupMark,
  [markupTypes.HAPPY]: MarkupHappy,
  [markupTypes.SAD]: MarkupSad,
  [markupTypes.LABEL]: MarkupLabel,

  //Special
  [markupTypes.SELECT]: MarkupSelect,
  [markupTypes.VARIATION]: MarkupVariation,
  [markupTypes.CANDIDATE]: MarkupCandidate,
  [markupTypes.SEQUENCE]: MarkupSequence,
  [markupTypes.LAST_MOVE]: MarkupLastMove,
  [markupTypes.MOVE_NUMBER]: MarkupMoveNumber,
}

/**
 * Markup factory class
 */
export default class MarkupFactory {

  /**
   * Check if markup of a given type can be created
   *
   * NOTE: this asks for the map's own keys rather than reading the property,
   * as everything inherited from the object prototype answers to a plain read
   * and 'constructor' would come back as a class to draw with
   */
  static isSupported(type) {
    return Object.hasOwn(markupClasses, type)
  }

  /**
   * Get markup class to use
   */
  static getClass(type) {

    //Unknown or not implemented
    if (!this.isSupported(type)) {
      throw new Error(`Unknown markup type: ${type}`)
    }

    //Return the class
    return markupClasses[type]
  }

  /**
   * Create markup
   */
  static create(type, board, ...args) {
    const MarkupClass = this.getClass(type)
    return new MarkupClass(board, ...args)
  }
}
