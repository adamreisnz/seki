import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Sad smiley markup
 */
export default class MarkupSad extends Markup {

  /**
   * Constructor
   */
  constructor(board, data) {

    //Parent constructor
    super(board, data)

    //Set type
    this.type = markupTypes.SAD
  }

  /**
   * Get grid erase radius
   */
  getGridEraseRadius() {
    return this.getRadius() * 0.8
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
    const lineCap = this.getLineCap()
    const canvasTranslate = theme.canvasTranslate(lineWidth)

    //Deltas
    const dEye = Math.round(radius * 0.36)
    const dxMouth = Math.round(radius * 0.6)
    const dyMouth = Math.round(radius * 0.6)
    const dxCp = Math.round(radius * 0.4)
    const dyCp = 0

    //Translate canvas
    context.translate(canvasTranslate, canvasTranslate)

    //Apply transparency?
    if (alpha && alpha < 1) {
      context.globalAlpha = alpha
    }

    //Configure context
    context.fillStyle = color
    context.strokeStyle = color
    context.lineWidth = lineWidth
    context.lineCap = lineCap

    //Draw element
    context.beginPath()
    context.arc(
      absX - dEye,
      absY - dEye,
      Math.round(radius / 6),
      0, 2 * Math.PI, true,
    )
    context.fill()
    context.beginPath()
    context.arc(
      absX + dEye,
      absY - dEye,
      Math.round(radius / 6),
      0, 2 * Math.PI, true,
    )
    context.fill()
    context.beginPath()
    context.moveTo(absX - dxMouth, absY + dyMouth)
    context.bezierCurveTo(
      absX - dxCp,
      absY + dyCp,
      absX + dxCp,
      absY + dyCp,
      absX + dxMouth,
      absY + dyMouth,
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
