import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Circle markup
 */
export default class MarkupCircle extends Markup {

  /**
   * Constructor
   */
  constructor(board, data) {

    //Parent constructor
    super(board, data)

    //Set type
    this.type = markupTypes.CIRCLE
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
    const lineDash = this.getLineDash()
    const canvasTranslate = theme.canvasTranslate(lineWidth)

    //Prepare context
    this.prepareContext(context, canvasTranslate)

    //Configure context
    context.strokeStyle = color
    context.lineWidth = lineWidth
    context.setLineDash(lineDash || [])

    //Draw element
    context.beginPath()
    context.arc(absX, absY, radius, 0, 2 * Math.PI, true)
    context.stroke()

    //Reset line dash
    context.setLineDash([])

    //Restore context
    this.restoreContext(context, canvasTranslate)
  }
}
