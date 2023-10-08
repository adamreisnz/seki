import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Circle markup
 */
export default class MarkupCircle extends Markup {

  //Type
  type = markupTypes.CIRCLE

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

    //Load properties
    this.loadProperties(x, y)

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
    context.arc(absX, absY, radius, 0, 2 * Math.PI, true)
    context.stroke()

    //Reset line dash
    context.setLineDash([])

    //Restore context
    this.restoreContext(context)
  }
}
