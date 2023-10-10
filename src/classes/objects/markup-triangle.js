import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Triangle markup
 */
export default class MarkupTriangle extends Markup {

  //Type
  type = markupTypes.TRIANGLE

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

    //Moving triangle a bit lower to look more natural next to squares
    const dy = Math.round(radius * Math.cos(Math.PI / 3.5))
    const dx = Math.round(radius * Math.cos(Math.PI / 6))

    //Prepare context
    this.prepareContext(context)

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

    //Restore context
    this.restoreContext(context)
  }
}
