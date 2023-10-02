import Markup from './markup.js'
import {markupTypes, cosPi6} from '../../constants/markup.js'

/**
 * Triangle markup
 */
export default class MarkupTriangle extends Markup {

  /**
   * Constructor
   */
  constructor(board) {

    //Parent constructor
    super(board)

    //Set type
    this.type = markupTypes.TRIANGLE
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

    //Draw element
    context.beginPath()
    context.moveTo(absX, absY - radius)
    context.lineTo(
      absX - Math.round(radius * cosPi6),
      absY + Math.round(radius / 2),
    )
    context.lineTo(
      absX + Math.round(radius * cosPi6),
      absY + Math.round(radius / 2),
    )
    context.closePath()
    context.stroke()

    //Reset transparency
    if (alpha && alpha < 1) {
      context.globalAlpha = 1
    }

    //Undo translation
    context.translate(-canvasTranslate, -canvasTranslate)
  }
}
