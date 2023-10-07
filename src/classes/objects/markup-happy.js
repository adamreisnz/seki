import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Happy smiley markup
 */
export default class MarkupHappy extends Markup {

  /**
   * Constructor
   */
  constructor(board, data) {

    //Parent constructor
    super(board, data)

    //Set type
    this.type = markupTypes.HAPPY
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
    const {board, theme} = this

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
    const dyMouth = Math.round(radius * 0.2)
    const dxCp = Math.round(radius * 0.4)
    const dyCp = Math.round(radius * 0.8)

    //Prepare context
    this.prepareContext(context, canvasTranslate)

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
      absX - dxCp, //cp1x
      absY + dyCp, //cp1y
      absX + dxCp, //cp2x
      absY + dyCp, //cp2y
      absX + dxMouth, //x
      absY + dyMouth, //y
    )
    context.stroke()

    //Restore context
    this.restoreContext(context, canvasTranslate)
  }
}
