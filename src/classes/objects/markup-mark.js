import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'
import {cosPi4} from '../../constants/common.js'

/**
 * Mark markup (cross)
 */
export default class MarkupMark extends Markup {

  /**
   * Constructor
   */
  constructor(board, data) {

    //Parent constructor
    super(board, data)

    //Set type
    this.type = markupTypes.MARK
  }

  /**
   * Draw
   */
  draw(context, x, y) {

    //Get data
    const {board, theme, alpha} = this

    //Get coordinates and stone radius
    const absX = board.getAbsX(x)
    const absY = board.getAbsY(y)
    const radius = this.getRadius()
    const color = this.getColor(x, y)

    //Get theme variables
    const lineWidth = this.getLineWidth()
    const lineCap = this.getLineCap()
    const canvasTranslate = theme.canvasTranslate(lineWidth)

    //Determine cos
    const rCos = Math.round(radius * cosPi4)

    //Translate canvas
    context.translate(canvasTranslate, canvasTranslate)

    //Apply transparency?
    if (alpha && alpha < 1) {
      context.globalAlpha = alpha
    }

    //Configure context
    context.strokeStyle = color
    context.lineWidth = lineWidth
    context.lineCap = lineCap

    //Draw element
    context.beginPath()
    context.moveTo(absX - rCos, absY - rCos)
    context.lineTo(absX + rCos, absY + rCos)
    context.moveTo(absX + rCos, absY - rCos)
    context.lineTo(absX - rCos, absY + rCos)
    context.stroke()

    //Reset transparency
    if (alpha && alpha < 1) {
      context.globalAlpha = 1
    }

    //Undo translation
    context.translate(-canvasTranslate, -canvasTranslate)
  }
}
