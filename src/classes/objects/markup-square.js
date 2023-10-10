import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Square markup
 */
export default class MarkupSquare extends Markup {

  //Type
  type = markupTypes.SQUARE

  /**
   * Draw
   */
  draw(context, x, y) {

    //Parent draw
    super.draw(context, x, y)

    //Get data
    const {radius, color, lineWidth} = this
    const absX = this.getAbsX(x)
    const absY = this.getAbsY(y)

    //Determine delta
    const d = Math.round(radius * Math.cos(Math.PI / 4))

    //Prepare context
    this.prepareContext(context)

    //Configure context
    context.strokeStyle = color
    context.lineWidth = lineWidth

    //Draw element
    context.beginPath()
    context.rect(
      absX - d,
      absY - d,
      2 * d,
      2 * d,
    )
    context.stroke()

    //Restore context
    this.restoreContext(context)
  }
}
