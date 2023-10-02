import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Sad smiley markup
 */
export default class MarkupSad extends Markup {

  /**
   * Constructor
   */
  constructor(board) {

    //Parent constructor
    super(board)

    //Set type
    this.type = markupTypes.SAD
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
    context.arc(
      absX - radius / 3,
      absY - radius / 3,
      radius / 6,
      0, 2 * Math.PI, true,
    )
    context.stroke()
    context.beginPath()
    context.arc(
      absX + radius / 3,
      absY - radius / 3,
      radius / 6,
      0, 2 * Math.PI, true,
    )
    context.stroke()
    context.beginPath()
    context.moveTo(absX - radius / 1.6, absY + radius / 8)
    context.bezierCurveTo(
      absX - radius / 1.8,
      absY + radius / 8 - 1,
      absX + radius / 1.8,
      absY + radius / 8 - 1,
      absX + radius / 1.6,
      absY + radius / 1.5 - 1,
    )
    context.stroke()

    //Reset transparency
    if (alpha && alpha < 1) {
      context.globalAlpha = 1
    }

    //Undo translation
    context.translate(-canvasTranslate, -canvasTranslate)
  }
}
