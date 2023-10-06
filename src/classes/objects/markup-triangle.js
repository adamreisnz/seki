import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

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

    //Parent draw
    super.draw(context, x, y)

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

    //Moving triangle a bit lower to look more natural next to squares
    const dy = Math.round(radius * Math.cos(Math.PI / 3.5))
    const dx = Math.round(radius * Math.cos(Math.PI / 6))

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
    context.moveTo(absX, absY - dy * 1.25)
    context.lineTo(
      absX - dx,
      absY + dy,
    )
    context.lineTo(
      absX + dx,
      absY + dy,
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
