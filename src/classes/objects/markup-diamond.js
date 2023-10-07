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
    const {board, theme} = this

    //Get coordinates and stone radius
    const absX = board.getAbsX(x)
    const absY = board.getAbsY(y)
    const radius = this.getRadius()
    const color = this.getColor(x, y)

    //Get theme variables
    const lineWidth = this.getLineWidth()
    const canvasTranslate = theme.canvasTranslate(lineWidth)

    //Prepare context
    this.prepareContext(context, canvasTranslate)

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

    //Restore context
    this.restoreContext(context, canvasTranslate)
  }
}
