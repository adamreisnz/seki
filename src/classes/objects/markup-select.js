import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Select markup
 */
export default class MarkupSelect extends Markup {

  //Type
  type = markupTypes.SELECT

  /**
   * Get grid erase radius
   */
  getGridEraseRadius() {
    return this.radius * 1.25
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
    context.fillStyle = color
    context.lineWidth = lineWidth

    //Draw element
    context.beginPath()
    context.arc(absX, absY, radius, 0, 2 * Math.PI, true)
    context.fill()

    //Restore context
    this.restoreContext(context)
  }
}
