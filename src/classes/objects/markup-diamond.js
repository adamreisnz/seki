import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Diamond markup
 */
export default class MarkupDiamond extends Markup {

  /**
   * Constructor
   */
  constructor(board, data) {

    //Parent constructor
    super(board, data)

    //Set type
    this.type = markupTypes.DIAMOND
  }

  /**
   * Get grid erase radius
   */
  getGridEraseRadius() {
    return this.getRadius() * 1.4
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
    context.lineTo(absX - radius, absY)
    context.lineTo(absX, absY + radius)
    context.lineTo(absX + radius, absY)
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