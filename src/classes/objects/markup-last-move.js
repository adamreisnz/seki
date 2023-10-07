import MarkupCircle from './markup-circle.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Last move marker
 */
export default class MarkupLastMove extends MarkupCircle {

  //Type
  type = markupTypes.LAST_MOVE
}
