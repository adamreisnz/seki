import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Diamond markup
 */
export default class MarkupDiamond extends Markup {

  //Type
  type = markupTypes.DIAMOND

  /**
   * Get grid erase radius
   */
  getGridEraseRadius() {
    return this.radius * 1.4
  }

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

    //Prepare context
    this.prepareContext(context)

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
    this.restoreContext(context)
  }
}
